import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SailPageRoutingModule } from './sail-routing.module';
import { SailPage } from './sail.page';

@NgModule({
  imports: [CommonModule, RouterModule, IonicModule, SailPageRoutingModule],
  declarations: [SailPage],
})
export class SailPageModule {}
