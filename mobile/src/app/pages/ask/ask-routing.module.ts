import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AskPage } from './ask.page';

const routes: Routes = [{ path: '', component: AskPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AskPageRoutingModule {}
