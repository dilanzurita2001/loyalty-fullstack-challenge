import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async findOneById(id: string): Promise<Merchant | null> {
    return this.merchantRepo.findOneBy({ id });
  }
}
