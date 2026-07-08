import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';

export enum RewardStatus {
  ACTIVE  = 'ACTIVE',
  PAUSED  = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column()
  merchantId: string;

  @ManyToOne(() => Merchant, { eager: false })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column()
  pointCost: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ACTIVE })
  status: RewardStatus;

  @CreateDateColumn()
  createdAt: Date;
}
