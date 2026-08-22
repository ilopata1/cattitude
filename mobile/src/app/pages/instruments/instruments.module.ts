import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InstrumentsRoutingModule } from './instruments-routing.module';
import { InstrumentsPage } from './instruments.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, InstrumentsRoutingModule],
  declarations: [InstrumentsPage],
})
export class InstrumentsModule {}
