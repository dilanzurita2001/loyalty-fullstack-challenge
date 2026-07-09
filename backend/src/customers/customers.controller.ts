import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { WalletService } from '../wallet/wallet.service';
import { ClaimsService } from '../claims/claims.service';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly walletService: WalletService,
    private readonly claimsService: ClaimsService,
  ) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':customerId/wallet')
  async getWallet(@Param('customerId') customerId: string) {
    const customer = await this.customersService.findOneById(customerId);
    if (!customer) throw new NotFoundException('Customer not found');
    return this.walletService.getWalletSummary(customerId);
  }

  @Get(':customerId/claims')
  async getClaims(@Param('customerId') customerId: string) {
    const customer = await this.customersService.findOneById(customerId);
    if (!customer) throw new NotFoundException('Customer not found');
    return this.claimsService.findByCustomer(customerId);
  }
}
