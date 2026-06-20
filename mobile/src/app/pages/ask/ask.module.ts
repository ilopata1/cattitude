import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AskPageRoutingModule } from './ask-routing.module';
import { AskPage } from './ask.page';

import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AskPageRoutingModule, SharedModule],
  declarations: [AskPage],
})
export class AskPageModule {}
