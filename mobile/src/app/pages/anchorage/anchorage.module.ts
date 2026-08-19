import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AnchorageRoutingModule } from './anchorage-routing.module';
import { AnchoragePage } from './anchorage.page';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, AnchorageRoutingModule],
  declarations: [AnchoragePage],
})
export class AnchorageModule {}
