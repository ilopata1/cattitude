import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PolarPage } from './polar.page';

const routes: Routes = [{ path: '', component: PolarPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PolarRoutingModule {}
