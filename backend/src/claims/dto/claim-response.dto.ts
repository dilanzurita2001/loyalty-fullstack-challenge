export class ClaimResponseDto {
  claimId: string;
  code: string;
  pointsDebited: number;
  remainingBalance: number;
  status: string;
}

export class ClaimListItemDto {
  id: string;
  rewardName: string;
  promoCode: string;
  pointsDebited: number;
  status: string;
  createdAt: Date;
}
