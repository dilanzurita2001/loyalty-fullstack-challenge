import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { WalletModule } from '../wallet/wallet.module';
import { ClaimsModule } from '../claims/claims.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    WalletModule,
    ClaimsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
