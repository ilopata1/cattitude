import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { InstrumentsRoutingModule } from './instruments-routing.module';
import { InstrumentsPage } from './instruments.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SharedModule, InstrumentsRoutingModule],
  declarations: [InstrumentsPage],
})
export class InstrumentsModule {}
