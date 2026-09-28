import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoPage } from './do.page';
import { ChecklistPage } from './checklist/checklist.page';
import { LearnPage } from './learn/learn.page';
import { LearnStagePage } from './learn/learn-stage.page';
import { LearnLessonPage } from './learn/learn-lesson.page';

const routes: Routes = [
  { path: '', component: DoPage },
  { path: 'learn', component: LearnPage },
  { path: 'learn/:stageId/:lessonId', component: LearnLessonPage },
  { path: 'learn/:stageId', component: LearnStagePage },
  { path: 'checklist/:key', component: ChecklistPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoPageRoutingModule {}
