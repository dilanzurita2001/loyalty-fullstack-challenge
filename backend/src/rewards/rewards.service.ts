import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward } from './entities/reward.entity';
import { RewardResponseDto } from './dto/reward-response.dto';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepo: Repository<Reward>,
  ) {}

  async findAll(): Promise<RewardResponseDto[]> {
    const rewards = await this.rewardRepo.find({
      relations: ['merchant'],
      order: { name: 'ASC' },
    });

    return rewards.map((r) => ({
      id:        r.id,
      slug:      r.slug,
      name:      r.name,
      merchant: {
        id:     r.merchant.id,
        name:   r.merchant.name,
        status: r.merchant.status,
      },
      pointCost: r.pointCost,
      stock:     r.stock,
      status:    r.status,
    }));
  }

  async findOneById(id: string): Promise<Reward | null> {
    return this.rewardRepo.findOne({ where: { id }, relations: ['merchant'] });
  }
}
