import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerResponseDto } from './dto/customer-response.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async findAll(): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepo.find({
      order: { name: 'ASC' },
    });

    return customers.map((c) => ({
      id:     c.id,
      slug:   c.slug,
      name:   c.name,
      status: c.status,
    }));
  }

  async findOneById(id: string): Promise<Customer | null> {
    return this.customerRepo.findOneBy({ id });
  }
}
