import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardClaim } from './entities/reward-claim.entity';
import { ClaimRewardUseCase, ClaimRewardCommand } from './usecases/claim-reward.usecase';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ClaimListItemDto } from './dto/claim-response.dto';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(RewardClaim)
    private readonly rewardClaimRepo: Repository<RewardClaim>,
    private readonly claimRewardUseCase: ClaimRewardUseCase,
  ) {}

  async createClaim(dto: CreateClaimDto) {
    const command: ClaimRewardCommand = {
      customerId:     dto.customerId,
      rewardId:       dto.rewardId,
      idempotencyKey: dto.idempotencyKey,
    };
    return this.claimRewardUseCase.execute(command);
  }

  async findByCustomer(customerId: string): Promise<ClaimListItemDto[]> {
    const claims = await this.rewardClaimRepo.find({
      where: { customerId },
      relations: ['reward'],
      order: { createdAt: 'DESC' },
    });

    return claims.map((c) => ({
      id:            c.id,
      rewardName:    c.reward?.name ?? 'Recompensa',
      promoCode:     c.promoCode,
      pointsDebited: c.pointsDebited,
      status:        c.status,
      createdAt:     c.createdAt,
    }));
  }
}
