import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';
import { RulesPage } from './rules.page';

const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'rules', component: RulesPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomePageRoutingModule {}
