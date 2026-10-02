import { Injectable, signal } from '@angular/core';

export interface AlarmNotice {
  id: number;
  title: string;
  body: string;
  severity: 'alarm' | 'emergency';
  actionLabel: string;
  /** Path segments under the vessel tabs route. */
  route: string[];
}

/**
 * One in-app alarm at a time. It stays until the crew dismisses it.
 * Device notifications, when allowed, are separate.
 */
@Injectable({ providedIn: 'root' })
export class AlarmBannerService {
  private nextId = 1;
  private readonly currentSignal = signal<AlarmNotice | null>(null);
  readonly current = this.currentSignal.asReadonly();

  show(notice: Omit<AlarmNotice, 'id'>): void {
    this.currentSignal.set({ ...notice, id: this.nextId++ });
  }

  dismiss(): void {
    this.currentSignal.set(null);
  }
}
