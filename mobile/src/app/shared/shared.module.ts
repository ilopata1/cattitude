import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { CoachCardComponent } from './components/coach-card/coach-card.component';
import { GuideChapterComponent } from './components/guide-chapter/guide-chapter.component';
import { PhotoOverlayComponent } from './components/photo-overlay/photo-overlay.component';
import { UiIconComponent } from './components/ui-icon/ui-icon.component';
import { RichHtmlDirective } from './directives/rich-html.directive';
import { CsReadingPipe } from './pipes/cs-reading.pipe';
import { CsArcGaugeComponent } from './components/viz/cs-arc-gauge.component';
import { CsCompassCardComponent } from './components/viz/cs-compass-card.component';
import { CsLevelBarComponent } from './components/viz/cs-level-bar.component';
import { CsSparklineComponent } from './components/viz/cs-sparkline.component';
import { CsWindDialComponent } from './components/viz/cs-wind-dial.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    CsSparklineComponent,
    CsWindDialComponent,
    CsArcGaugeComponent,
    CsLevelBarComponent,
    CsCompassCardComponent,
  ],
  declarations: [
    AppHeaderComponent,
    CoachCardComponent,
    PhotoOverlayComponent,
    RichHtmlDirective,
    GuideChapterComponent,
    UiIconComponent,
    CsReadingPipe,
  ],
  exports: [
    AppHeaderComponent,
    CoachCardComponent,
    PhotoOverlayComponent,
    RichHtmlDirective,
    GuideChapterComponent,
    UiIconComponent,
    CsReadingPipe,
    CsSparklineComponent,
    CsWindDialComponent,
    CsArcGaugeComponent,
    CsLevelBarComponent,
    CsCompassCardComponent,
  ],
})
export class SharedModule {}
