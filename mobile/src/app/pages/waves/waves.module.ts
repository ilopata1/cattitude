import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { WavesPage } from './waves.page';
import { WavesRoutingModule } from './waves-routing.module';

@NgModule({
  imports: [CommonModule, IonicModule, SharedModule, WavesRoutingModule],
  declarations: [WavesPage],
})
export class WavesModule {}
