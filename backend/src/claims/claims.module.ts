import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardClaim } from './entities/reward-claim.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Reward } from '../rewards/entities/reward.entity';
import { WalletLedger } from '../wallet/entities/wallet-ledger.entity';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { ClaimRewardUseCase } from './usecases/claim-reward.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([RewardClaim, Customer, Reward, WalletLedger]),
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService, ClaimRewardUseCase],
  exports: [ClaimsService],
})
export class ClaimsModule {}
