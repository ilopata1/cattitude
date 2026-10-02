import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'cattitude.notifications.enabled';

/**
 * Whether this device should raise sail, anchorage, and Signal-K alerts.
 * Missing storage means on. This does not ask the browser for permission.
 */
@Injectable({ providedIn: 'root' })
export class NotificationPreferenceService {
  private readonly enabledSignal = signal(this.read());
  readonly enabled = this.enabledSignal.asReadonly();

  setEnabled(on: boolean): void {
    this.enabledSignal.set(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      /* private mode and full storage can refuse the write */
    }
  }

  private read(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  }
}
