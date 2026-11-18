import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AbTestPage } from './ab-test.page';

const routes: Routes = [{ path: '', component: AbTestPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AbTestRoutingModule {}
