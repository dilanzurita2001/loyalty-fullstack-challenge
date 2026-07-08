import { Routes } from '@angular/router';
import { RewardsPageComponent } from './rewards/rewards-page.component';

export const routes: Routes = [
  { path: '',   component: RewardsPageComponent },
  { path: '**', redirectTo: '' },
];
