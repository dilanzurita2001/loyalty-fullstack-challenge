import { DataSource, Repository } from 'typeorm';
import { ClaimRewardUseCase } from '../src/claims/usecases/claim-reward.usecase';
import { Customer, CustomerStatus } from '../src/customers/entities/customer.entity';
import { Merchant, MerchantStatus } from '../src/merchants/entities/merchant.entity';
import { Reward, RewardStatus } from '../src/rewards/entities/reward.entity';
import { WalletLedger, LedgerType } from '../src/wallet/entities/wallet-ledger.entity';
import { RewardClaim, ClaimStatus } from '../src/claims/entities/reward-claim.entity';

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function makeRepo<T>(): MockRepo<T> {
  return {
    findOne:      jest.fn(),
    findOneBy:    jest.fn(),
    findOneByOrFail: jest.fn(),
    find:         jest.fn(),
    save:         jest.fn(),
    update:       jest.fn(),
    decrement:    jest.fn(),
    sum:          jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id:        'cus-uuid-001',
    slug:      'cus_001',
    name:      'Ana Torres',
    status:    CustomerStatus.ACTIVE,
    createdAt: new Date(),
    ...overrides,
  } as Customer;
}

function makeMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id:        'mer-uuid-001',
    slug:      'mer_001',
    name:      'Coffee House',
    status:    MerchantStatus.ACTIVE,
    createdAt: new Date(),
    ...overrides,
  } as Merchant;
}

function makeReward(overrides: Partial<Reward> = {}): Reward {
  return {
    id:         'rew-uuid-001',
    slug:       'rew_001',
    name:       '20% Coffee Coupon',
    merchantId: 'mer-uuid-001',
    merchant:   makeMerchant(),
    pointCost:  100,
    stock:      5,
    status:     RewardStatus.ACTIVE,
    createdAt:  new Date(),
    ...overrides,
  } as Reward;
}

function makeExistingClaim(overrides: Partial<RewardClaim> = {}): RewardClaim {
  return {
    id:             'claim-uuid-existing',
    customerId:     'cus-uuid-001',
    rewardId:       'rew-uuid-001',
    promoCode:      'EXISTING',
    pointsDebited:  100,
    idempotencyKey: 'idem-key-existing',
    status:         ClaimStatus.ISSUED,
    createdAt:      new Date(),
    ...overrides,
  } as RewardClaim;
}

describe('ClaimRewardUseCase', () => {
  let useCase: ClaimRewardUseCase;
  let customerRepo: MockRepo<Customer>;
  let rewardRepo: MockRepo<Reward>;
  let walletLedgerRepo: MockRepo<WalletLedger>;
  let rewardClaimRepo: MockRepo<RewardClaim>;
  let dataSource: Partial<DataSource>;
  let entityManager: any;

  beforeEach(() => {
    entityManager = {
      findOne:    jest.fn(),
      save:       jest.fn(),
      update:     jest.fn(),
      decrement:  jest.fn(),
      getRepository: jest.fn(),
    };

    customerRepo    = makeRepo<Customer>();
    rewardRepo      = makeRepo<Reward>();
    walletLedgerRepo = makeRepo<WalletLedger>();
    rewardClaimRepo  = makeRepo<RewardClaim>();

    dataSource = {
      transaction: jest.fn().mockImplementation(
        async (fn: (em: typeof entityManager) => any) => fn(entityManager),
      ),
    } as Partial<DataSource>;

    useCase = new ClaimRewardUseCase(
      customerRepo      as unknown as Repository<Customer>,
      rewardRepo        as unknown as Repository<Reward>,
      walletLedgerRepo  as unknown as Repository<WalletLedger>,
      rewardClaimRepo   as unknown as Repository<RewardClaim>,
      dataSource        as DataSource,
    );
  });

  it('1. debería ejecutar un canje exitosamente', async () => {
    const customer = makeCustomer();
    const reward   = makeReward();

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(500);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    entityManager.findOne
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(reward);
    entityManager.save.mockImplementation((entity: any) =>
      Promise.resolve({ ...entity, id: 'claim-uuid-001' }),
    );
    entityManager.decrement.mockResolvedValue({ affected: 1 });
    entityManager.update.mockResolvedValue({ affected: 1 });

    const result = await useCase.execute({
      customerId:     customer.id,
      rewardId:       reward.id,
      idempotencyKey: 'idem-key-001',
    });

    expect(result.code).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);
    expect(result.pointsDebited).toBe(100);
    expect(result.remainingBalance).toBe(400);
    expect(result.status).toBe('ISSUED');
  });

  it('2. debería rechazar a un cliente bloqueado', async () => {
    const customer = makeCustomer({ status: CustomerStatus.BLOCKED });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       'rew-uuid-001',
        idempotencyKey: 'idem-key-002',
      }),
    ).rejects.toThrow('CUSTOMER_BLOCKED');
  });

  it('3. debería rechazar cuando el merchant está inactivo', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({
      merchant: makeMerchant({ status: MerchantStatus.INACTIVE }),
    });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-003',
      }),
    ).rejects.toThrow('MERCHANT_INACTIVE');
  });

  it('4. debería rechazar cuando la recompensa está pausada', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({ status: RewardStatus.PAUSED });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-004',
      }),
    ).rejects.toThrow('REWARD_NOT_AVAILABLE');
  });

  it('5. debería rechazar cuando la recompensa está expirada', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({ status: RewardStatus.EXPIRED });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-005',
      }),
    ).rejects.toThrow('REWARD_NOT_AVAILABLE');
  });

  it('6. debería rechazar cuando los puntos son insuficientes', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({ pointCost: 500 });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(200);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-006',
      }),
    ).rejects.toThrow('INSUFFICIENT_POINTS');
  });

  it('7. debería rechazar cuando no hay stock disponible', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({ stock: 0 });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-007',
      }),
    ).rejects.toThrow('OUT_OF_STOCK');
  });

  it('8. debería descontar exactamente los puntos del costo de la recompensa', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({ pointCost: 200 });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(500);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    entityManager.findOne
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(reward);
    entityManager.save.mockImplementation((entity: any) =>
      Promise.resolve({ ...entity, id: 'uuid-001' }),
    );
    entityManager.decrement.mockResolvedValue({ affected: 1 });
    entityManager.update.mockResolvedValue({ affected: 1 });

    const result = await useCase.execute({
      customerId:     customer.id,
      rewardId:       reward.id,
      idempotencyKey: 'idem-key-008',
    });

    expect(result.pointsDebited).toBe(200);
    expect(result.remainingBalance).toBe(300);
  });

  it('9. debería reducir el stock de la recompensa en 1', async () => {
    const customer = makeCustomer();
    const reward   = makeReward({ stock: 3, pointCost: 100 });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(500);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    entityManager.findOne
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(reward);
    entityManager.save.mockImplementation((entity: any) =>
      Promise.resolve({ ...entity, id: 'uuid-001' }),
    );

    let stockReduced = false;
    entityManager.decrement.mockImplementation(() => {
      stockReduced = true;
      return Promise.resolve({ affected: 1 });
    });
    entityManager.update.mockImplementation((_entity: any, _criteria: any, _values: any) => {
      stockReduced = true;
      return Promise.resolve({ affected: 1 });
    });

    await useCase.execute({
      customerId:     customer.id,
      rewardId:       reward.id,
      idempotencyKey: 'idem-key-009',
    });

    expect(stockReduced).toBe(true);
  });

  it('10. debería retornar el mismo resultado para el mismo idempotencyKey', async () => {
    const customer      = makeCustomer();
    const reward        = makeReward();
    const existingClaim = makeExistingClaim();

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(400);
    rewardClaimRepo.findOne!.mockResolvedValue(existingClaim);
    rewardClaimRepo.findOneBy!.mockResolvedValue(existingClaim);

    const result = await useCase.execute({
      customerId:     customer.id,
      rewardId:       reward.id,
      idempotencyKey: 'idem-key-existing',
    });

    expect(result.claimId).toBe('claim-uuid-existing');
    expect(result.code).toBe('EXISTING');
    expect(result.status).toBe('ISSUED');

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('11. no debe permitir que el saldo quede negativo (validación de borde)', async () => {

    const customer = makeCustomer();
    const reward   = makeReward({ pointCost: 101 });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(100);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-011',
      }),
    ).rejects.toThrow('INSUFFICIENT_POINTS');
  });

  it('12. no debe permitir que el stock quede negativo (validación de borde)', async () => {

    const customer = makeCustomer();
    const reward   = makeReward({ stock: 0, pointCost: 100 });

    customerRepo.findOne!.mockResolvedValue(customer);
    customerRepo.findOneBy!.mockResolvedValue(customer);
    rewardRepo.findOne!.mockResolvedValue(reward);
    rewardRepo.findOneBy!.mockResolvedValue(reward);
    walletLedgerRepo.sum!.mockResolvedValue(500);
    rewardClaimRepo.findOne!.mockResolvedValue(null);
    rewardClaimRepo.findOneBy!.mockResolvedValue(null);

    await expect(
      useCase.execute({
        customerId:     customer.id,
        rewardId:       reward.id,
        idempotencyKey: 'idem-key-012',
      }),
    ).rejects.toThrow('OUT_OF_STOCK');
  });
});
