import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum MerchantStatus {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: MerchantStatus, default: MerchantStatus.ACTIVE })
  status: MerchantStatus;

  @CreateDateColumn()
  createdAt: Date;
}
