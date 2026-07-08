export class ClaimError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ClaimError';
  }
}

export const ClaimErrors = {
  CUSTOMER_BLOCKED: () =>
    new ClaimError('CUSTOMER_BLOCKED', 'The customer account is blocked.'),

  MERCHANT_INACTIVE: () =>
    new ClaimError('MERCHANT_INACTIVE', 'The merchant is currently inactive.'),

  REWARD_NOT_AVAILABLE: () =>
    new ClaimError('REWARD_NOT_AVAILABLE', 'This reward is not available.'),

  OUT_OF_STOCK: () =>
    new ClaimError('OUT_OF_STOCK', 'This reward is out of stock.'),

  INSUFFICIENT_POINTS: () =>
    new ClaimError('INSUFFICIENT_POINTS', 'The customer does not have enough points.'),
};
