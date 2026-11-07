import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { LevelsPage } from './levels.page';
import { LevelsRoutingModule } from './levels-routing.module';

@NgModule({
  imports: [CommonModule, RouterModule, IonicModule, SharedModule, LevelsRoutingModule],
  declarations: [LevelsPage],
})
export class LevelsModule {}
