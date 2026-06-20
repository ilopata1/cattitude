import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { DoPageRoutingModule } from './do-routing.module';
import { DoPage } from './do.page';
import { ChecklistPage } from './checklist/checklist.page';
import { LearnPage } from './learn/learn.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, IonicModule, DoPageRoutingModule, SharedModule],
  declarations: [DoPage, ChecklistPage, LearnPage],
})
export class DoPageModule {}
