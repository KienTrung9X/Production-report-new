import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { PlanEntryComponent } from '../app/plan-entry/plan-entry';
import { RawDataComponent } from './raw-data.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'plan-entry', component: PlanEntryComponent },
  { path: 'raw-data', component: RawDataComponent },
];