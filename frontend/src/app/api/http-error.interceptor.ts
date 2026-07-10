import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { getClaimErrorMessage } from './claim-error.util';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(`Request failed: ${req.method} ${req.url}`, error);
      return throwError(() => new Error(getClaimErrorMessage(error)));
    }),
  );
};
