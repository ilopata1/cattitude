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
        path: 'ask',
        loadChildren: () =>
          import('../pages/ask/ask.module').then((m) => m.AskPageModule),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
