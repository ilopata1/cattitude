import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnchoragePage } from './anchorage.page';

const routes: Routes = [{ path: '', component: AnchoragePage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnchorageRoutingModule {}
