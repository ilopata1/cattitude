import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { vesselGuideGuard } from './core/guards/vessel-guide.guard';

const defaultVessel = environment.defaultVesselSlug;

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
  { path: 'tabs/home', redirectTo: () => `/v/${defaultVessel}/tabs/home`, pathMatch: 'full' },
  { path: 'tabs/do', redirectTo: () => `/v/${defaultVessel}/tabs/do`, pathMatch: 'full' },
  { path: 'tabs/know', redirectTo: () => `/v/${defaultVessel}/tabs/know`, pathMatch: 'full' },
  { path: 'tabs/fix', redirectTo: () => `/v/${defaultVessel}/tabs/fix`, pathMatch: 'full' },
  { path: 'tabs/ask', redirectTo: () => `/v/${defaultVessel}/tabs/more/ask`, pathMatch: 'full' },
  { path: 'tabs/sail', redirectTo: () => `/v/${defaultVessel}/tabs/more/sail`, pathMatch: 'full' },
  { path: 'tabs/anchorage', redirectTo: () => `/v/${defaultVessel}/tabs/more/anchorage`, pathMatch: 'full' },
  { path: 'tabs/polar', redirectTo: () => `/v/${defaultVessel}/tabs/more/polar`, pathMatch: 'full' },
  {
    path: 'tabs/settings/sail-plan',
    redirectTo: () => `/v/${defaultVessel}/tabs/more/settings/sail-plan`,
    pathMatch: 'full',
  },
  {
    path: 'tabs/settings/instruments',
    redirectTo: () => `/v/${defaultVessel}/tabs/more/settings/instruments`,
    pathMatch: 'full',
  },
  { path: 'tabs/settings', redirectTo: () => `/v/${defaultVessel}/tabs/more/settings`, pathMatch: 'full' },
  { path: 'tabs/do/learn', redirectTo: () => `/v/${defaultVessel}/tabs/do/learn`, pathMatch: 'full' },
  {
    path: 'tabs/do/learn/:stageId/:lessonId',
    redirectTo: ({ params }) =>
      `/v/${defaultVessel}/tabs/do/learn/${params['stageId']}/${params['lessonId']}`,
  },
  {
    path: 'tabs/do/learn/:stageId',
    redirectTo: ({ params }) => `/v/${defaultVessel}/tabs/do/learn/${params['stageId']}`,
  },
  {
    path: 'tabs/do/checklist/:key',
    redirectTo: ({ params }) => `/v/${defaultVessel}/tabs/do/checklist/${params['key']}`,
    pathMatch: 'full',
  },
  { path: 'tabs', redirectTo: () => `/v/${defaultVessel}/tabs/home`, pathMatch: 'full' },
  { path: '', redirectTo: () => `/v/${defaultVessel}/tabs/home`, pathMatch: 'full' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
