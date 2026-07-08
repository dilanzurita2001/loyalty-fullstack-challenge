import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClaimDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  rewardId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
