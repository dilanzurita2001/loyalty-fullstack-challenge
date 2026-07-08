export interface Customer {
  id:     string;
  slug:   string;
  name:   string;
  status: 'ACTIVE' | 'BLOCKED';
}

export interface MerchantRef {
  id:     string;
  name:   string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Reward {
  id:        string;
  slug:      string;
  name:      string;
  merchant:  MerchantRef;
  pointCost: number;
  stock:     number;
  status:    'ACTIVE' | 'PAUSED' | 'EXPIRED';
}

export interface WalletSummary {
  customerId: string;
  balance:    number;
}

export interface ClaimListItem {
  id:            string;
  rewardName:    string;
  promoCode:     string;
  pointsDebited: number;
  status:        'ISSUED' | 'CANCELLED';
  createdAt:     string;
}

export interface CreateClaimRequest {
  customerId:     string;
  rewardId:       string;
  idempotencyKey: string;
}

export interface ClaimSuccessResponse {
  claimId:          string;
  code:             string;
  pointsDebited:    number;
  remainingBalance: number;
  status:           string;
}

export interface ApiErrorResponse {
  error:   string;
  message: string;
}
