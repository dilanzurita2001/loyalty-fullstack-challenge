import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum CustomerStatus {
  ACTIVE  = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @CreateDateColumn()
  createdAt: Date;
}
