import { Component, OnInit, signal, inject } from '@angular/core';
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
    this.api.getCustomers().subscribe({
      next:  (customers) => this.customers.set(customers),
      error: (err)       => console.error('Error loading customers', err),
    });
  }

  loadRewards(): void {
    this.isLoadingRewards.set(true);
    this.api.getRewards().subscribe({
      next:     (rewards) => this.rewards.set(rewards),
      error:    (err)     => console.error('Error loading rewards', err),
      complete: ()        => this.isLoadingRewards.set(false),
    });
  }

  loadWallet(): void {
    const customerId = this.selectedCustomerId();
    if (!customerId) return;

    this.isLoadingWallet.set(true);
    this.api.getWallet(customerId).subscribe({
      next:     (wallet) => this.wallet.set(wallet),
      error:    (err)    => console.error('Error loading wallet', err),
      complete: ()       => this.isLoadingWallet.set(false),
    });
  }

  loadClaims(): void {
    const customerId = this.selectedCustomerId();
    if (!customerId) return;

    this.isLoadingClaims.set(true);
    this.api.getClaims(customerId).subscribe({
      next:     (claims) => this.claims.set(claims),
      error:    (err)    => console.error('Error loading claims', err),
      complete: ()       => this.isLoadingClaims.set(false),
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
    if (!this.selectedCustomerId()) return;
  }

  isRewardAvailable(reward: Reward): boolean {
    return (
      reward.status === 'ACTIVE' &&
      reward.merchant.status === 'ACTIVE' &&
      reward.stock > 0
    );
  }
}
