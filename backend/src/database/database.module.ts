import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Reward } from '../rewards/entities/reward.entity';
import { WalletLedger } from '../wallet/entities/wallet-ledger.entity';
import { RewardClaim } from '../claims/entities/reward-claim.entity';
import { migrations } from './migrations';
import { SeedService } from './seeds/seed.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Customer, Merchant, Reward, WalletLedger, RewardClaim],
      migrations,
      migrationsRun: true,
      synchronize: false,
    }),
  ],
  providers: [SeedService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
