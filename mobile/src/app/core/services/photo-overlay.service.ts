import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PhotoOverlayState {
  open: boolean;
  src: string;
  caption: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoOverlayService {
  private readonly state = new BehaviorSubject<PhotoOverlayState>({
    open: false,
    src: '',
    caption: '',
  });

  readonly state$ = this.state.asObservable();

  openPhoto(src: string, caption: string): void {
    this.state.next({ open: true, src, caption });
  }

  close(): void {
    this.state.next({ open: false, src: '', caption: '' });
  }
}
