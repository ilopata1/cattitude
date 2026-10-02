import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MorePage } from './more.page';

const routes: Routes = [
  { path: '', component: MorePage },
  {
    path: 'ask',
    loadChildren: () => import('../ask/ask.module').then((m) => m.AskPageModule),
  },
  {
    path: 'sail',
    loadChildren: () => import('../sail/sail.module').then((m) => m.SailPageModule),
  },
  {
    path: 'anchorage',
    loadChildren: () =>
      import('../anchorage/anchorage.module').then((m) => m.AnchorageModule),
  },
  {
    path: 'polar',
    loadChildren: () => import('../polar/polar.module').then((m) => m.PolarModule),
  },
  {
    path: 'logbook',
    loadChildren: () => import('../logbook/logbook.module').then((m) => m.LogbookModule),
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('../settings/settings.module').then((m) => m.SettingsPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MorePageRoutingModule {}
