import { Component, input } from '@angular/core';
import { ClaimListItem } from '../api/api.types';

@Component({
  selector:    'app-claims-list',
  standalone:  true,
  imports:     [],
  templateUrl: './claims-list.component.html',
  styleUrls:   ['./claims-list.component.css'],
})
export class ClaimsListComponent {
  readonly claims = input<ClaimListItem[]>([]);
}
