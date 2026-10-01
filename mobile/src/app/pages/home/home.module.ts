import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';
import { RulesPage } from './rules.page';
import { BoatRulesComponent } from './boat-rules.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HomePageRoutingModule, SharedModule],
  declarations: [HomePage, RulesPage, BoatRulesComponent],
})
export class HomePageModule {}
