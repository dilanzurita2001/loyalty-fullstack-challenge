import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletLedger } from './entities/wallet-ledger.entity';
import { WalletSummaryDto } from './dto/wallet-summary.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletLedger)
    private readonly ledgerRepo: Repository<WalletLedger>,
  ) {}

  async getBalance(customerId: string): Promise<number> {
    return (await this.ledgerRepo.sum('points', { customerId })) ?? 0;
  }

  async getWalletSummary(customerId: string): Promise<WalletSummaryDto> {
    const balance = await this.getBalance(customerId);
    return { customerId, balance };
  }
}
