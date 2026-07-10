import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ClaimError } from '../../claims/errors/claim.errors';

interface NormalizedErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.normalize(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${body.statusCode} ${body.error}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${body.statusCode} ${body.error}`);
    }

    response.status(body.statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedErrorBody {
    if (exception instanceof ClaimError) {
      const statusCode =
        exception.code === 'IDEMPOTENCY_KEY_CONFLICT'
          ? HttpStatus.CONFLICT
          : HttpStatus.UNPROCESSABLE_ENTITY;
      return { statusCode, error: exception.code, message: exception.userMessage };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        return { statusCode: status, error: exception.name, message: responseBody };
      }

      const body = responseBody as { error?: string; message?: string | string[] };
      const isValidationError = status === HttpStatus.BAD_REQUEST && Array.isArray(body.message);

      return {
        statusCode: status,
        error: isValidationError ? 'VALIDATION_ERROR' : (body.error ?? exception.name),
        message: body.message ?? exception.message,
      };
    }

    if (exception instanceof QueryFailedError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'DATABASE_ERROR',
        message: 'A database error occurred.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    };
  }
}
