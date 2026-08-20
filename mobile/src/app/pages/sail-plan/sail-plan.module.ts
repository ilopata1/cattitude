import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SailPlanRoutingModule } from './sail-plan-routing.module';
import { SailPlanPage } from './sail-plan.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SailPlanRoutingModule],
  declarations: [SailPlanPage],
})
export class SailPlanModule {}
