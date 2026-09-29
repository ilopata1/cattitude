import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('../pages/home/home.module').then((m) => m.HomePageModule),
      },
      {
        path: 'do',
        loadChildren: () =>
          import('../pages/do/do.module').then((m) => m.DoPageModule),
      },
      {
        path: 'know',
        loadChildren: () =>
          import('../pages/know/know.module').then((m) => m.KnowPageModule),
      },
      {
        path: 'fix',
        loadChildren: () =>
          import('../pages/fix/fix.module').then((m) => m.FixPageModule),
      },
      {
        path: 'more',
        loadChildren: () =>
          import('../pages/more/more.module').then((m) => m.MorePageModule),
      },
      { path: 'ask', redirectTo: 'more/ask', pathMatch: 'full' },
      { path: 'sail', redirectTo: 'more/sail', pathMatch: 'full' },
      { path: 'anchorage', redirectTo: 'more/anchorage', pathMatch: 'full' },
      { path: 'polar', redirectTo: 'more/polar', pathMatch: 'full' },
      { path: 'settings/sail-plan', redirectTo: 'more/settings/sail-plan', pathMatch: 'full' },
      { path: 'settings/instruments', redirectTo: 'more/settings/instruments', pathMatch: 'full' },
      { path: 'settings', redirectTo: 'more/settings', pathMatch: 'full' },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
