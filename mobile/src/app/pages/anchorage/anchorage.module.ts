import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AnchorageRoutingModule } from './anchorage-routing.module';
import { AnchoragePage } from './anchorage.page';
import { WindRosePopoverComponent } from './components/wind-rose-popover/wind-rose-popover.component';
import { AnchorageAlertBannerComponent } from './components/alert-banner/alert-banner.component';
import { AnchorageVesselDetailComponent } from './components/vessel-detail/vessel-detail.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, AnchorageRoutingModule],
  declarations: [
    AnchoragePage,
    WindRosePopoverComponent,
    AnchorageAlertBannerComponent,
    AnchorageVesselDetailComponent,
  ],
})
export class AnchorageModule {}
