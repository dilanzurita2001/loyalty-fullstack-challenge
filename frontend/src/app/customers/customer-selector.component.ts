import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../api/api.types';

@Component({
  selector:   'app-customer-selector',
  standalone: true,
  imports:    [FormsModule],
  templateUrl: './customer-selector.component.html',
  styleUrls:   ['./customer-selector.component.css'],
})
export class CustomerSelectorComponent {
  readonly customers        = input.required<Customer[]>();
  readonly selectedId       = input<string | null>(null);
  readonly customerSelected = output<string>();

  onSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) this.customerSelected.emit(value);
  }
}
