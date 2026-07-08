export class RewardResponseDto {
  id: string;
  slug: string;
  name: string;
  merchant: {
    id: string;
    name: string;
    status: string;
  };
  pointCost: number;
  stock: number;
  status: string;
}
