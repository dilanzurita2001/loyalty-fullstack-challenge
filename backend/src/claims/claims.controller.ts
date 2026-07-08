import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ClaimError } from './errors/claim.errors';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  async createClaim(@Body() dto: CreateClaimDto) {
    try {
      return await this.claimsService.createClaim(dto);
    } catch (error) {
      if (error instanceof ClaimError) {
        throw new HttpException(
          { error: error.code, message: error.message },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (error?.message === 'NOT_IMPLEMENTED') {
        throw new HttpException(
          { error: 'NOT_IMPLEMENTED', message: 'Not implemented.' },
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      throw error;
    }
  }
}
