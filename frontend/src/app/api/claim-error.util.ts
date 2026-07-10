import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from './api.types';

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_BLOCKED: 'El cliente está bloqueado y no puede canjear recompensas.',
  MERCHANT_INACTIVE: 'La empresa que ofrece esta recompensa está inactiva.',
  REWARD_NOT_AVAILABLE: 'Esta recompensa ya no está disponible.',
  OUT_OF_STOCK: 'El stock de esta recompensa ya no está disponible.',
  INSUFFICIENT_POINTS: 'No tienes puntos suficientes para este canje.',
  IDEMPOTENCY_KEY_CONFLICT: 'Ocurrió un conflicto al procesar tu solicitud. Intenta nuevamente.',
};

export function getClaimErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorResponse | null;
    if (body?.error && CLAIM_ERROR_MESSAGES[body.error]) {
      return CLAIM_ERROR_MESSAGES[body.error];
    }
  }

  return 'Ocurrió un error técnico inesperado. Intenta nuevamente.';
}
