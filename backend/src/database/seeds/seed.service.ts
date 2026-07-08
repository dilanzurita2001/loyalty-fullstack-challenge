import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Customer, CustomerStatus } from '../../customers/entities/customer.entity';
import { Merchant, MerchantStatus } from '../../merchants/entities/merchant.entity';
import { Reward, RewardStatus } from '../../rewards/entities/reward.entity';
import { WalletLedger, LedgerType } from '../../wallet/entities/wallet-ledger.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      this.logger.error('Seed failed:', error);
    }
  }

  private async run(): Promise<void> {
    const merchantRepo = this.dataSource.getRepository(Merchant);
    const customerRepo = this.dataSource.getRepository(Customer);
    const rewardRepo   = this.dataSource.getRepository(Reward);
    const ledgerRepo   = this.dataSource.getRepository(WalletLedger);

    await merchantRepo.createQueryBuilder()
      .insert().into(Merchant)
      .values([
        { slug: 'mer_001', name: 'Coffee House', status: MerchantStatus.ACTIVE   },
        { slug: 'mer_002', name: 'Fit Gym',      status: MerchantStatus.ACTIVE   },
        { slug: 'mer_003', name: 'Old Cinema',   status: MerchantStatus.INACTIVE },
      ])
      .orIgnore().execute();

    const coffeeHouse = await merchantRepo.findOneByOrFail({ slug: 'mer_001' });
    const fitGym      = await merchantRepo.findOneByOrFail({ slug: 'mer_002' });
    const oldCinema   = await merchantRepo.findOneByOrFail({ slug: 'mer_003' });

    await customerRepo.createQueryBuilder()
      .insert().into(Customer)
      .values([
        { slug: 'cus_001', name: 'Ana Torres', status: CustomerStatus.ACTIVE  },
        { slug: 'cus_002', name: 'Luis Mora',  status: CustomerStatus.ACTIVE  },
        { slug: 'cus_003', name: 'Carla Ríos', status: CustomerStatus.BLOCKED },
      ])
      .orIgnore().execute();

    const ana   = await customerRepo.findOneByOrFail({ slug: 'cus_001' });
    const luis  = await customerRepo.findOneByOrFail({ slug: 'cus_002' });
    const carla = await customerRepo.findOneByOrFail({ slug: 'cus_003' });

    await rewardRepo.createQueryBuilder()
      .insert().into(Reward)
      .values([
        { slug: 'rew_001', name: '20% Coffee Coupon',     merchantId: coffeeHouse.id, pointCost: 100, stock: 5, status: RewardStatus.ACTIVE  },
        { slug: 'rew_002', name: 'Gym Day Pass',          merchantId: fitGym.id,      pointCost: 200, stock: 1, status: RewardStatus.ACTIVE  },
        { slug: 'rew_003', name: 'Premium Coupon',        merchantId: coffeeHouse.id, pointCost: 700, stock: 3, status: RewardStatus.ACTIVE  },
        { slug: 'rew_004', name: 'Expired Cinema Ticket', merchantId: oldCinema.id,   pointCost: 100, stock: 5, status: RewardStatus.ACTIVE  },
        { slug: 'rew_005', name: 'Paused Reward',         merchantId: coffeeHouse.id, pointCost: 100, stock: 5, status: RewardStatus.PAUSED  },
        { slug: 'rew_006', name: 'No Stock Reward',       merchantId: coffeeHouse.id, pointCost: 100, stock: 0, status: RewardStatus.ACTIVE  },
      ])
      .orIgnore().execute();

    const creditCount = await ledgerRepo.count({ where: { type: LedgerType.CREDIT } });
    if (creditCount === 0) {
      await ledgerRepo.save([
        { customerId: ana.id,   type: LedgerType.CREDIT, points: 500, description: 'Welcome credit' },
        { customerId: luis.id,  type: LedgerType.CREDIT, points: 50,  description: 'Welcome credit' },
        { customerId: carla.id, type: LedgerType.CREDIT, points: 300, description: 'Welcome credit' },
      ]);
    }

    this.logger.log('Seed completed.');
  }
}
