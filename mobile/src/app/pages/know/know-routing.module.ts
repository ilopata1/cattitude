import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowChapterPage } from './know-chapter.page';
import { KnowPage } from './know.page';

const routes: Routes = [
  { path: '', component: KnowPage },
  { path: ':systemId', component: KnowChapterPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class KnowPageRoutingModule {}
