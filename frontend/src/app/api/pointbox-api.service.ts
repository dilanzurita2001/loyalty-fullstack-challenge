import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Customer,
  Reward,
  WalletSummary,
  ClaimListItem,
  CreateClaimRequest,
  ClaimSuccessResponse,
} from './api.types';

@Injectable({ providedIn: 'root' })
export class PointboxApiService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.baseUrl}/customers`);
  }

  getRewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.baseUrl}/rewards`);
  }

  getWallet(customerId: string): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(
      `${this.baseUrl}/customers/${customerId}/wallet`,
    );
  }

  getClaims(customerId: string): Observable<ClaimListItem[]> {
    return this.http.get<ClaimListItem[]>(
      `${this.baseUrl}/customers/${customerId}/claims`,
    );
  }

  createClaim(request: CreateClaimRequest): Observable<ClaimSuccessResponse> {
    return this.http.post<ClaimSuccessResponse>(
      `${this.baseUrl}/claims`,
      request,
    );
  }
}
