import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { PhotoOverlayComponent } from './components/photo-overlay/photo-overlay.component';
import { RichHtmlDirective } from './directives/rich-html.directive';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [AppHeaderComponent, PhotoOverlayComponent, RichHtmlDirective],
  exports: [AppHeaderComponent, PhotoOverlayComponent, RichHtmlDirective],
})
export class SharedModule {}
