import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { vesselGuideGuard } from './core/guards/vessel-guide.guard';

const routes: Routes = [
  {
    path: 'v/:vesselSlug',
    children: [
      {
        path: 'error',
        loadChildren: () =>
          import('./pages/vessel-error/vessel-error.module').then(
            (m) => m.VesselErrorPageModule,
          ),
      },
      {
        path: 'tabs',
        loadChildren: () =>
          import('./tabs/tabs.module').then((m) => m.TabsPageModule),
        canActivate: [vesselGuideGuard],
      },
      { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
    ],
  },
  { path: 'tabs/home', redirectTo: 'v/cattitude/tabs/home', pathMatch: 'full' },
  { path: 'tabs/do', redirectTo: 'v/cattitude/tabs/do', pathMatch: 'full' },
  { path: 'tabs/know', redirectTo: 'v/cattitude/tabs/know', pathMatch: 'full' },
  { path: 'tabs/fix', redirectTo: 'v/cattitude/tabs/fix', pathMatch: 'full' },
  { path: 'tabs/ask', redirectTo: 'v/cattitude/tabs/ask', pathMatch: 'full' },
  { path: 'tabs/do/learn', redirectTo: 'v/cattitude/tabs/do/learn', pathMatch: 'full' },
  {
    path: 'tabs/do/checklist/:key',
    redirectTo: 'v/cattitude/tabs/do/checklist/:key',
  },
  { path: 'tabs', redirectTo: 'v/cattitude/tabs/home', pathMatch: 'full' },
  { path: '', redirectTo: 'v/cattitude/tabs/home', pathMatch: 'full' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
