import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsPage } from './settings.page';

const routes: Routes = [
  { path: '', component: SettingsPage },
  {
    path: 'sail-plan',
    loadChildren: () =>
      import('../sail-plan/sail-plan.module').then((m) => m.SailPlanModule),
  },
  {
    path: 'instruments',
    loadChildren: () =>
      import('../instruments/instruments.module').then((m) => m.InstrumentsModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsPageRoutingModule {}
