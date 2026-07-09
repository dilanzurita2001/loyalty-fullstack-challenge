import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ClaimError } from './errors/claim.errors';

@ApiTags('claims')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  async createClaim(@Body() dto: CreateClaimDto) {
    try {
      return await this.claimsService.createClaim(dto);
    } catch (error) {
      if (error instanceof ClaimError) {
        const status =
          error.code === 'IDEMPOTENCY_KEY_CONFLICT'
            ? HttpStatus.CONFLICT
            : HttpStatus.UNPROCESSABLE_ENTITY;
        throw new HttpException({ error: error.code, message: error.userMessage }, status);
      }

      throw error;
    }
  }
}
