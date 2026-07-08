import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

export enum LedgerType {
  CREDIT = 'CREDIT',
  DEBIT  = 'DEBIT',
}

@Entity('wallet_ledger')
export class WalletLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => Customer, { eager: false })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ type: 'enum', enum: LedgerType })
  type: LedgerType;

  @Column()
  points: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  claimId: string;

  @CreateDateColumn()
  createdAt: Date;
}
