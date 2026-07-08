import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Reward } from '../../rewards/entities/reward.entity';
import { WalletLedger } from '../../wallet/entities/wallet-ledger.entity';
import { RewardClaim } from '../entities/reward-claim.entity';
import { ClaimResponseDto } from '../dto/claim-response.dto';

export interface ClaimRewardCommand {
  customerId: string;
  rewardId: string;
  idempotencyKey: string;
}

@Injectable()
export class ClaimRewardUseCase {
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
    throw new Error('NOT_IMPLEMENTED');
  }
}
