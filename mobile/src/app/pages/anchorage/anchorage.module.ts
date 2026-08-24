import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AnchorageRoutingModule } from './anchorage-routing.module';
import { AnchoragePage } from './anchorage.page';
import { WindRosePopoverComponent } from './components/wind-rose-popover/wind-rose-popover.component';
import { AnchorageAlertBannerComponent } from './components/alert-banner/alert-banner.component';
import { AnchorageVesselDetailComponent } from './components/vessel-detail/vessel-detail.component';
import { MetresPipe } from './pipes/metres.pipe';
import { AgePipe } from './pipes/age.pipe';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AnchorageRoutingModule],
  declarations: [
    AnchoragePage,
    WindRosePopoverComponent,
    AnchorageAlertBannerComponent,
    AnchorageVesselDetailComponent,
    MetresPipe,
    AgePipe,
  ],
})
export class AnchorageModule {}
