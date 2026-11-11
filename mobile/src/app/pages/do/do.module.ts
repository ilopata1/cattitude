import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DoPageRoutingModule } from './do-routing.module';
import { DoPage } from './do.page';
import { ChecklistPage } from './checklist/checklist.page';
import { InspectionPage } from './inspection/inspection.page';
import { LearnPage } from './learn/learn.page';
import { LearnStagePage } from './learn/learn-stage.page';
import { LearnLessonPage } from './learn/learn-lesson.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, DoPageRoutingModule, SharedModule],
  declarations: [DoPage, ChecklistPage, InspectionPage, LearnPage, LearnStagePage, LearnLessonPage],
})
export class DoPageModule {}
