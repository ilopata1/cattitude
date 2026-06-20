import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FixPage } from './fix.page';

const routes: Routes = [{ path: '', component: FixPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FixPageRoutingModule {}
