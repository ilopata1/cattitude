import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { KnowPageRoutingModule } from './know-routing.module';
import { KnowChapterPage } from './know-chapter.page';
import { KnowPage } from './know.page';

import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, KnowPageRoutingModule, SharedModule],
  declarations: [KnowPage, KnowChapterPage],
})
export class KnowPageModule {}
