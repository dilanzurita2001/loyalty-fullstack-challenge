import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletLedger } from './entities/wallet-ledger.entity';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletLedger])],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
