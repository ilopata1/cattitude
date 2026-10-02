import { inject, NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { vesselGuideGuard } from './core/guards/vessel-guide.guard';
import { VesselResolverService } from './core/services/vessel-resolver.service';

/** Legacy `/` and `/tabs/…` URLs follow the host's default vessel. */
const withDefaultVessel = (path: string): string =>
  `/v/${inject(VesselResolverService).defaultSlug()}${path}`;

export const routes: Routes = [
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
  { path: 'tabs/home', redirectTo: () => withDefaultVessel('/tabs/home'), pathMatch: 'full' },
  { path: 'tabs/do', redirectTo: () => withDefaultVessel('/tabs/do'), pathMatch: 'full' },
  { path: 'tabs/know', redirectTo: () => withDefaultVessel('/tabs/know'), pathMatch: 'full' },
  { path: 'tabs/fix', redirectTo: () => withDefaultVessel('/tabs/fix'), pathMatch: 'full' },
  { path: 'tabs/ask', redirectTo: () => withDefaultVessel('/tabs/more/ask'), pathMatch: 'full' },
  { path: 'tabs/sail', redirectTo: () => withDefaultVessel('/tabs/more/sail'), pathMatch: 'full' },
  { path: 'tabs/anchorage', redirectTo: () => withDefaultVessel('/tabs/more/anchorage'), pathMatch: 'full' },
  { path: 'tabs/polar', redirectTo: () => withDefaultVessel('/tabs/more/polar'), pathMatch: 'full' },
  {
    path: 'tabs/settings/sail-plan',
    redirectTo: () => withDefaultVessel('/tabs/more/settings/sail-plan'),
    pathMatch: 'full',
  },
  {
    path: 'tabs/settings/instruments',
    redirectTo: () => withDefaultVessel('/tabs/more/settings/instruments'),
    pathMatch: 'full',
  },
  { path: 'tabs/settings', redirectTo: () => withDefaultVessel('/tabs/more/settings'), pathMatch: 'full' },
  { path: 'tabs/do/learn', redirectTo: () => withDefaultVessel('/tabs/do/learn'), pathMatch: 'full' },
  {
    path: 'tabs/do/learn/:stageId/:lessonId',
    redirectTo: ({ params }) =>
      withDefaultVessel(`/tabs/do/learn/${params['stageId']}/${params['lessonId']}`),
  },
  {
    path: 'tabs/do/learn/:stageId',
    redirectTo: ({ params }) => withDefaultVessel(`/tabs/do/learn/${params['stageId']}`),
  },
  {
    path: 'tabs/do/checklist/:key',
    redirectTo: ({ params }) => withDefaultVessel(`/tabs/do/checklist/${params['key']}`),
    pathMatch: 'full',
  },
  { path: 'tabs', redirectTo: () => withDefaultVessel('/tabs/home'), pathMatch: 'full' },
  { path: '', redirectTo: () => withDefaultVessel('/tabs/home'), pathMatch: 'full' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
