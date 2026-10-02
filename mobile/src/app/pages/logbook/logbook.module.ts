import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { LogbookPage } from './logbook.page';
import { LogbookRoutingModule } from './logbook-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SharedModule, LogbookRoutingModule],
  declarations: [LogbookPage],
})
export class LogbookModule {}
