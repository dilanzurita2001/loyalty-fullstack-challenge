import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { CustomersModule } from './customers/customers.module';
import { MerchantsModule } from './merchants/merchants.module';
import { RewardsModule } from './rewards/rewards.module';
import { WalletModule } from './wallet/wallet.module';
import { ClaimsModule } from './claims/claims.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    CustomersModule,
    MerchantsModule,
    RewardsModule,
    WalletModule,
    ClaimsModule,
  ],
})
export class AppModule {}
