import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WalletSummary } from '../api/api.types';

@Component({
  selector:    'app-wallet-summary',
  standalone:  true,
  imports:     [DecimalPipe],
  templateUrl: './wallet-summary.component.html',
  styleUrls:   ['./wallet-summary.component.css'],
})
export class WalletSummaryComponent {
  readonly wallet = input<WalletSummary | null>(null);
}
