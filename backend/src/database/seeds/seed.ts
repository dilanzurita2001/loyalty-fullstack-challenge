import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { Customer, CustomerStatus } from '../../customers/entities/customer.entity';
import { Merchant, MerchantStatus } from '../../merchants/entities/merchant.entity';
import { Reward, RewardStatus } from '../../rewards/entities/reward.entity';
import { WalletLedger, LedgerType } from '../../wallet/entities/wallet-ledger.entity';

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const merchantRepo = AppDataSource.getRepository(Merchant);
    const customerRepo = AppDataSource.getRepository(Customer);
    const rewardRepo = AppDataSource.getRepository(Reward);
    const ledgerRepo = AppDataSource.getRepository(WalletLedger);

    await merchantRepo
      .createQueryBuilder()
      .insert()
      .into(Merchant)
      .values([
        { slug: 'mer_001', name: 'Coffee House', status: MerchantStatus.ACTIVE },
        { slug: 'mer_002', name: 'Fit Gym',      status: MerchantStatus.ACTIVE },
        { slug: 'mer_003', name: 'Old Cinema',   status: MerchantStatus.INACTIVE },
      ])
      .orIgnore()
      .execute();

    const coffeHouse = await merchantRepo.findOneByOrFail({ slug: 'mer_001' });
    const fitGym     = await merchantRepo.findOneByOrFail({ slug: 'mer_002' });
    const oldCinema  = await merchantRepo.findOneByOrFail({ slug: 'mer_003' });

    await customerRepo
      .createQueryBuilder()
      .insert()
      .into(Customer)
      .values([
        { slug: 'cus_001', name: 'Ana Torres', status: CustomerStatus.ACTIVE },
        { slug: 'cus_002', name: 'Luis Mora',  status: CustomerStatus.ACTIVE },
        { slug: 'cus_003', name: 'Carla Ríos', status: CustomerStatus.BLOCKED },
      ])
      .orIgnore()
      .execute();

    const ana   = await customerRepo.findOneByOrFail({ slug: 'cus_001' });
    const luis  = await customerRepo.findOneByOrFail({ slug: 'cus_002' });
    const carla = await customerRepo.findOneByOrFail({ slug: 'cus_003' });

    await rewardRepo
      .createQueryBuilder()
      .insert()
      .into(Reward)
      .values([
        {
          slug: 'rew_001', name: '20% Coffee Coupon',
          merchantId: coffeHouse.id, pointCost: 100, stock: 5, status: RewardStatus.ACTIVE,
        },
        {
          slug: 'rew_002', name: 'Gym Day Pass',
          merchantId: fitGym.id, pointCost: 200, stock: 1, status: RewardStatus.ACTIVE,
        },
        {
          slug: 'rew_003', name: 'Premium Coupon',
          merchantId: coffeHouse.id, pointCost: 700, stock: 3, status: RewardStatus.ACTIVE,
        },
        {
          slug: 'rew_004', name: 'Expired Cinema Ticket',
          merchantId: oldCinema.id, pointCost: 100, stock: 5, status: RewardStatus.ACTIVE,
        },
        {
          slug: 'rew_005', name: 'Paused Reward',
          merchantId: coffeHouse.id, pointCost: 100, stock: 5, status: RewardStatus.PAUSED,
        },
        {
          slug: 'rew_006', name: 'No Stock Reward',
          merchantId: coffeHouse.id, pointCost: 100, stock: 0, status: RewardStatus.ACTIVE,
        },
      ])
      .orIgnore()
      .execute();

    const creditCount = await ledgerRepo.count({ where: { type: LedgerType.CREDIT } });

    if (creditCount === 0) {
      await ledgerRepo.save([
        {
          customerId: ana.id,
          type: LedgerType.CREDIT,
          points: 500,
          description: 'Crédito inicial de bienvenida',
        },
        {
          customerId: luis.id,
          type: LedgerType.CREDIT,
          points: 50,
          description: 'Crédito inicial de bienvenida',
        },
        {
          customerId: carla.id,
          type: LedgerType.CREDIT,
          points: 300,
          description: 'Crédito inicial de bienvenida',
        },
      ]);
    }

    console.log('Seed completado exitosamente.');
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
