import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WavesPage } from './waves.page';

const routes: Routes = [{ path: '', component: WavesPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WavesRoutingModule {}
