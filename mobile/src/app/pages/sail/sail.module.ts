import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SailPageRoutingModule } from './sail-routing.module';
import { SailPage } from './sail.page';
import { WindSteerPanelComponent } from '../../instruments/skip/wind-steer-panel.component';
import { SailEssentialsComponent } from '../../instruments/sail-essentials/sail-essentials.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    IonicModule,
    SailPageRoutingModule,
    WindSteerPanelComponent,
    SailEssentialsComponent,
  ],
  declarations: [SailPage],
})
export class SailPageModule {}
