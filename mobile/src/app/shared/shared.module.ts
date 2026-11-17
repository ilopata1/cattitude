import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { GuideChapterComponent } from './components/guide-chapter/guide-chapter.component';
import { PhotoOverlayComponent } from './components/photo-overlay/photo-overlay.component';
import { UiIconComponent } from './components/ui-icon/ui-icon.component';
import { RichHtmlDirective } from './directives/rich-html.directive';
import { CsReadingPipe } from './pipes/cs-reading.pipe';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [
    AppHeaderComponent,
    PhotoOverlayComponent,
    RichHtmlDirective,
    GuideChapterComponent,
    UiIconComponent,
    CsReadingPipe,
  ],
  exports: [
    AppHeaderComponent,
    PhotoOverlayComponent,
    RichHtmlDirective,
    GuideChapterComponent,
    UiIconComponent,
    CsReadingPipe,
  ],
})
export class SharedModule {}
