import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { AbTestPage } from './ab-test.page';
import { AbTestRoutingModule } from './ab-test-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SharedModule, AbTestRoutingModule],
  declarations: [AbTestPage],
})
export class AbTestModule {}
