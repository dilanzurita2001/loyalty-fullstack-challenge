import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PointboxApiService } from '../api/pointbox-api.service';
import { Customer, Reward, WalletSummary, ClaimListItem } from '../api/api.types';
import { CustomerSelectorComponent } from '../customers/customer-selector.component';
import { WalletSummaryComponent } from '../wallet/wallet-summary.component';
import { ClaimsListComponent } from '../claims/claims-list.component';
import { DecimalPipe } from '@angular/common';

@Component({
  selector:    'app-rewards-page',
  standalone:  true,
  imports:     [
    CustomerSelectorComponent,
    WalletSummaryComponent,
    ClaimsListComponent,
    DecimalPipe,
  ],
  templateUrl: './rewards-page.component.html',
  styleUrls:   ['./rewards-page.component.css'],
})
export class RewardsPageComponent implements OnInit {
  private readonly api = inject(PointboxApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly customers          = signal<Customer[]>([]);
  readonly selectedCustomerId = signal<string | null>(null);
  readonly rewards            = signal<Reward[]>([]);
  readonly wallet             = signal<WalletSummary | null>(null);
  readonly claims             = signal<ClaimListItem[]>([]);
  readonly isLoadingRewards   = signal(false);
  readonly isLoadingWallet    = signal(false);
  readonly isLoadingClaims    = signal(false);
  readonly isClaiming         = signal(false);
  readonly lastClaimCode      = signal<string | null>(null);
  readonly lastError          = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCustomers();
    this.loadRewards();
  }

  loadCustomers(): void {
    this.api.getCustomers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (customers) => this.customers.set(customers),
        error: (err: Error) => this.lastError.set(err.message),
      });
  }

  loadRewards(): void {
    this.isLoadingRewards.set(true);
    this.api.getRewards()
      .pipe(
        finalize(() => this.isLoadingRewards.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (rewards) => this.rewards.set(rewards),
        error: (err: Error) => this.lastError.set(err.message),
      });
  }

  loadWallet(): void {
    const customerId = this.selectedCustomerId();
    if (!customerId) return;

    this.isLoadingWallet.set(true);
    this.api.getWallet(customerId)
      .pipe(
        finalize(() => this.isLoadingWallet.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (wallet) => this.wallet.set(wallet),
        error: (err: Error) => this.lastError.set(err.message),
      });
  }

  loadClaims(): void {
    const customerId = this.selectedCustomerId();
    if (!customerId) return;

    this.isLoadingClaims.set(true);
    this.api.getClaims(customerId)
      .pipe(
        finalize(() => this.isLoadingClaims.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (claims) => this.claims.set(claims),
        error: (err: Error) => this.lastError.set(err.message),
      });
  }

  onCustomerSelected(customerId: string): void {
    this.selectedCustomerId.set(customerId);
    this.wallet.set(null);
    this.claims.set([]);
    this.lastClaimCode.set(null);
    this.lastError.set(null);
    this.loadWallet();
    this.loadClaims();
  }

  handleClaim(reward: Reward): void {
    const customerId = this.selectedCustomerId();
    if (!customerId || this.isClaiming()) return;

    this.isClaiming.set(true);
    this.lastError.set(null);
    this.lastClaimCode.set(null);

    this.api
      .createClaim({
        customerId,
        rewardId: reward.id,
        idempotencyKey: crypto.randomUUID(),
      })
      .pipe(
        finalize(() => this.isClaiming.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.lastClaimCode.set(response.code);
          this.wallet.update((w) => (w ? { ...w, balance: response.remainingBalance } : w));
          this.loadRewards();
          this.loadClaims();
        },
        error: (err: Error) => {
          this.lastError.set(err.message);
        },
      });
  }

  isRewardAvailable(reward: Reward): boolean {
    return (
      reward.status === 'ACTIVE' &&
      reward.merchant.status === 'ACTIVE' &&
      reward.stock > 0
    );
  }
}
