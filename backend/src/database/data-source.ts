import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Customer } from '../customers/entities/customer.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Reward } from '../rewards/entities/reward.entity';
import { WalletLedger } from '../wallet/entities/wallet-ledger.entity';
import { RewardClaim } from '../claims/entities/reward-claim.entity';
import { migrations } from './migrations';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Customer, Merchant, Reward, WalletLedger, RewardClaim],
  migrations,
  synchronize: false,
});
