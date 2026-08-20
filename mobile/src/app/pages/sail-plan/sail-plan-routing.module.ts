import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SailPlanPage } from './sail-plan.page';

const routes: Routes = [{ path: '', component: SailPlanPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SailPlanRoutingModule {}
