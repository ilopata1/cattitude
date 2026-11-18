import { Injectable, signal } from '@angular/core';

/** Classic is the Skip dial. Modern is the compass card. */
export type DialStyle = 'classic' | 'modern';

export const DIAL_STYLE_KEY = 'cattitude.dialStyle';

@Injectable({ providedIn: 'root' })
export class DialStyleService {
  private readonly styleSignal = signal<DialStyle>(this.read());
  readonly style = this.styleSignal.asReadonly();

  setStyle(style: DialStyle): void {
    this.styleSignal.set(style);
    try {
      localStorage.setItem(DIAL_STYLE_KEY, style);
    } catch {
      /* private mode and full storage can refuse the write */
    }
  }

  private read(): DialStyle {
    try {
      const stored = localStorage.getItem(DIAL_STYLE_KEY);
      if (stored === 'classic' || stored === 'modern') return stored;
    } catch {
      /* storage can throw in private mode */
    }
    return 'classic';
  }
}
