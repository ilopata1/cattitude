import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { KnowPageRoutingModule } from './know-routing.module';
import { KnowPage } from './know.page';

import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, IonicModule, KnowPageRoutingModule, SharedModule],
  declarations: [KnowPage],
})
export class KnowPageModule {}
