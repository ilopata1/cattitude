import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { VesselContextService } from './vessel-context.service';

const STORAGE_KEY = 'cattitude.currentSails.v1';

/** The sail configuration the crew says is up, remembered on this device. */
@Injectable({ providedIn: 'root' })
export class CurrentSailService {
  private readonly vesselContext = inject(VesselContextService);
  private readonly configurationSignal = signal(this.read());
  private readonly changedSubject = new Subject<void>();
  readonly configuration = this.configurationSignal.asReadonly();
  readonly changed$ = this.changedSubject.asObservable();

  set(value: string): void {
    const trimmed = value.trim();
    this.configurationSignal.set(trimmed);
    try {
      localStorage.setItem(this.storageKey(), trimmed);
    } catch {
      /* private mode and full storage can refuse the write */
    }
    this.changedSubject.next();
    if (trimmed) {
      this.requestNotificationPermission();
    }
  }

  private requestNotificationPermission(): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') {
      return;
    }
    void Notification.requestPermission();
  }

  private read(): string {
    try {
      return localStorage.getItem(this.storageKey()) ?? '';
    } catch {
      return '';
    }
  }

  private storageKey(): string {
    return `${STORAGE_KEY}:${this.vesselContext.vesselSlug}`;
  }
}
