import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Customer, CustomerStatus } from '../../customers/entities/customer.entity';
import { Merchant, MerchantStatus } from '../../merchants/entities/merchant.entity';
import { Reward, RewardStatus } from '../../rewards/entities/reward.entity';
import { WalletLedger, LedgerType } from '../../wallet/entities/wallet-ledger.entity';
import { RewardClaim, ClaimStatus } from '../entities/reward-claim.entity';
import { ClaimResponseDto } from '../dto/claim-response.dto';
import { ClaimError, ClaimErrors } from '../errors/claim.errors';
import { generatePromoCode } from '../utils/promo-code.generator';

export interface ClaimRewardCommand {
  customerId: string;
  rewardId: string;
  idempotencyKey: string;
}

const MAX_PROMO_CODE_ATTEMPTS = 5;

@Injectable()
export class ClaimRewardUseCase {
  private readonly logger = new Logger(ClaimRewardUseCase.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Reward)
    private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(WalletLedger)
    private readonly walletLedgerRepo: Repository<WalletLedger>,
    @InjectRepository(RewardClaim)
    private readonly rewardClaimRepo: Repository<RewardClaim>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(command: ClaimRewardCommand): Promise<ClaimResponseDto> {
    const { customerId, rewardId, idempotencyKey } = command;
    this.logger.log(
      `Claim requested customer=${customerId} reward=${rewardId} idempotencyKey=${idempotencyKey}`,
    );

    const replay = await this.findReplay(customerId, idempotencyKey);
    if (replay) {
      return replay;
    }

    const customer = await this.customerRepo.findOneBy({ id: customerId });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.assertCustomerActive(customer);

    const reward = await this.rewardRepo.findOne({
      where: { id: rewardId },
      relations: ['merchant'],
    });
    if (!reward) {
      throw new NotFoundException('Reward not found');
    }
    this.assertMerchantActive(reward.merchant);
    this.assertRewardAvailable(reward);
    this.assertStockAvailable(reward);

    const balance = await this.getBalance(customerId);
    this.assertSufficientBalance(balance, reward.pointCost);

    this.logger.log(
      `Pre-checks passed customer=${customerId} reward=${rewardId} cost=${reward.pointCost} balance=${balance}, entering transaction`,
    );

    try {
      return await this.dataSource.transaction((manager) =>
        this.executeInTransaction(manager, command),
      );
    } catch (error) {
      if (this.isUniqueViolation(error, 'idempotencykey')) {
        this.logger.warn(
          `Concurrent duplicate detected for idempotencyKey=${idempotencyKey}; another request already committed, returning its result`,
        );
        const winner = await this.rewardClaimRepo.findOneOrFail({ where: { idempotencyKey } });
        return this.toResponse(winner, await this.getBalance(winner.customerId));
      }

      if (!(error instanceof ClaimError)) {
        this.logger.error(
          `Unexpected error while claiming reward customer=${customerId} reward=${rewardId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      throw error;
    }
  }

  private async executeInTransaction(
    manager: EntityManager,
    { customerId, rewardId, idempotencyKey }: ClaimRewardCommand,
  ): Promise<ClaimResponseDto> {
    const lockedCustomer = await manager.findOne(Customer, {
      where: { id: customerId },
      lock: { mode: 'pessimistic_write' },
    });
    const lockedReward = await manager.findOne(Reward, {
      where: { id: rewardId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedCustomer || !lockedReward) {
      throw new NotFoundException('Customer or reward no longer exists');
    }

    this.assertCustomerActive(lockedCustomer);
    this.assertRewardAvailable(lockedReward);
    this.assertStockAvailable(lockedReward);

    const currentBalance = await this.getBalance(customerId);
    this.assertSufficientBalance(currentBalance, lockedReward.pointCost);

    const claim = await this.saveClaimWithUniquePromoCode(manager, {
      customerId,
      rewardId,
      pointsDebited: lockedReward.pointCost,
      idempotencyKey,
    });

    const ledgerEntry = new WalletLedger();
    ledgerEntry.customerId = customerId;
    ledgerEntry.type = LedgerType.DEBIT;
    ledgerEntry.points = -lockedReward.pointCost;
    ledgerEntry.description = `Redeemed for ${lockedReward.name}`;
    ledgerEntry.claimId = claim.id;
    await manager.save(ledgerEntry);

    await manager.decrement(Reward, { id: rewardId }, 'stock', 1);

    this.logger.log(
      `Claim issued claim=${claim.id} code=${claim.promoCode} customer=${customerId} reward=${rewardId} pointsDebited=${lockedReward.pointCost}`,
    );

    return this.toResponse(claim, currentBalance - lockedReward.pointCost);
  }

  private async findReplay(
    customerId: string,
    idempotencyKey: string,
  ): Promise<ClaimResponseDto | null> {
    const existingClaim = await this.rewardClaimRepo.findOne({ where: { idempotencyKey } });
    if (!existingClaim) {
      return null;
    }

    if (existingClaim.customerId !== customerId) {
      this.logger.warn(
        `idempotencyKey=${idempotencyKey} already belongs to customer=${existingClaim.customerId}, rejecting reuse by customer=${customerId}`,
      );
      throw ClaimErrors.IDEMPOTENCY_KEY_CONFLICT();
    }

    this.logger.log(
      `Idempotent replay idempotencyKey=${idempotencyKey} -> claim=${existingClaim.id}, no points debited again`,
    );
    return this.toResponse(existingClaim, await this.getBalance(existingClaim.customerId));
  }

  private async saveClaimWithUniquePromoCode(
    manager: EntityManager,
    data: { customerId: string; rewardId: string; pointsDebited: number; idempotencyKey: string },
  ): Promise<RewardClaim> {
    for (let attempt = 1; attempt <= MAX_PROMO_CODE_ATTEMPTS; attempt++) {
      const claim = new RewardClaim();
      claim.customerId = data.customerId;
      claim.rewardId = data.rewardId;
      claim.pointsDebited = data.pointsDebited;
      claim.idempotencyKey = data.idempotencyKey;
      claim.promoCode = generatePromoCode();
      claim.status = ClaimStatus.ISSUED;

      try {
        return await manager.save(claim);
      } catch (error) {
        if (this.isUniqueViolation(error, 'promocode') && attempt < MAX_PROMO_CODE_ATTEMPTS) {
          this.logger.warn(`Promo code collision on attempt ${attempt}, generating a new one`);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to generate a unique promo code after multiple attempts');
  }

  private async getBalance(customerId: string): Promise<number> {
    return (await this.walletLedgerRepo.sum('points', { customerId })) ?? 0;
  }

  private assertCustomerActive(customer: Customer): void {
    if (customer.status !== CustomerStatus.ACTIVE) {
      this.logger.warn(`Rejected claim: customer=${customer.id} is ${customer.status}`);
      throw ClaimErrors.CUSTOMER_BLOCKED();
    }
  }

  private assertMerchantActive(merchant: Merchant): void {
    if (merchant.status !== MerchantStatus.ACTIVE) {
      this.logger.warn(`Rejected claim: merchant=${merchant.id} is ${merchant.status}`);
      throw ClaimErrors.MERCHANT_INACTIVE();
    }
  }

  private assertRewardAvailable(reward: Reward): void {
    if (reward.status !== RewardStatus.ACTIVE) {
      this.logger.warn(`Rejected claim: reward=${reward.id} is ${reward.status}`);
      throw ClaimErrors.REWARD_NOT_AVAILABLE();
    }
  }

  private assertStockAvailable(reward: Reward): void {
    if (reward.stock < 1) {
      this.logger.warn(`Rejected claim: reward=${reward.id} has no stock left`);
      throw ClaimErrors.OUT_OF_STOCK();
    }
  }

  private assertSufficientBalance(balance: number, pointCost: number): void {
    if (balance < pointCost) {
      this.logger.warn(`Rejected claim: balance=${balance} is below cost=${pointCost}`);
      throw ClaimErrors.INSUFFICIENT_POINTS();
    }
  }

  private isUniqueViolation(error: unknown, constraintHint: string): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = (error as { driverError?: { code?: string; constraint?: string } })
      .driverError;
    return (
      driverError?.code === '23505' &&
      (driverError.constraint ?? '').toLowerCase().includes(constraintHint)
    );
  }

  private toResponse(claim: RewardClaim, remainingBalance: number): ClaimResponseDto {
    return {
      claimId: claim.id,
      code: claim.promoCode,
      pointsDebited: claim.pointsDebited,
      remainingBalance,
      status: claim.status,
    };
  }
}
