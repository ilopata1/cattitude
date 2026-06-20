import { Directive, HostListener } from '@angular/core';
import { PhotoOverlayService } from '../../core/services/photo-overlay.service';

@Directive({
  selector: '[appRichHtml]',
  standalone: false,
})
export class RichHtmlDirective {
  constructor(private readonly photoOverlay: PhotoOverlayService) {}

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) {
      return;
    }
    event.preventDefault();
    this.photoOverlay.openPhoto(
      target.getAttribute('src') || target.src,
      target.getAttribute('alt') || '',
    );
  }
}
