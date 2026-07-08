import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Reward } from '../../rewards/entities/reward.entity';

export enum ClaimStatus {
  ISSUED    = 'ISSUED',
  CANCELLED = 'CANCELLED',
}

@Entity('reward_claims')
export class RewardClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => Customer, { eager: false })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  rewardId: string;

  @ManyToOne(() => Reward, { eager: false })
  @JoinColumn({ name: 'rewardId' })
  reward: Reward;

  @Column({ unique: true })
  promoCode: string;

  @Column()
  pointsDebited: number;

  @Index()
  @Column({ unique: true })
  idempotencyKey: string;

  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.ISSUED })
  status: ClaimStatus;

  @CreateDateColumn()
  createdAt: Date;
}
