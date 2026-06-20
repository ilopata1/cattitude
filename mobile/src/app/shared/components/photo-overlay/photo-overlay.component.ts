import { Component } from '@angular/core';
import { PhotoOverlayService } from '../../../core/services/photo-overlay.service';

@Component({
  selector: 'app-photo-overlay',
  templateUrl: './photo-overlay.component.html',
  styleUrls: ['./photo-overlay.component.scss'],
  standalone: false,
})
export class PhotoOverlayComponent {
  readonly state$ = this.photoOverlay.state$;

  constructor(private readonly photoOverlay: PhotoOverlayService) {}

  close(): void {
    this.photoOverlay.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
