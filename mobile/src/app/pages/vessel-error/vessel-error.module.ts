import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { VesselErrorPage } from './vessel-error.page';

const routes: Routes = [{ path: '', component: VesselErrorPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [VesselErrorPage],
})
export class VesselErrorPageModule {}
