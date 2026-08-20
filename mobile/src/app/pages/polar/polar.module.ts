import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PolarRoutingModule } from './polar-routing.module';
import { PolarPage } from './polar.page';

@NgModule({
  imports: [CommonModule, IonicModule, PolarRoutingModule],
  declarations: [PolarPage],
})
export class PolarModule {}
