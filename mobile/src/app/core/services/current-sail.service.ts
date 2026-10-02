import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  CurrentSailSelection,
  EMPTY_CURRENT_SAILS,
  MainReef,
  formatCurrentSails,
  isMainReef,
} from '../guide/current-sail';
import { VesselContextService } from './vessel-context.service';

const STORAGE_KEY = 'cattitude.currentSails.v2';

/** The mainsail and headsail the crew says are up, remembered on this device. */
@Injectable({ providedIn: 'root' })
export class CurrentSailService {
  private readonly vesselContext = inject(VesselContextService);
  private readonly selectionSignal = signal(this.read());
  private readonly changedSubject = new Subject<void>();
  readonly selection = this.selectionSignal.asReadonly();
  readonly changed$ = this.changedSubject.asObservable();

  configuration(): string {
    return formatCurrentSails(this.selectionSignal());
  }

  setMain(main: MainReef): void {
    this.write({ ...this.selectionSignal(), main });
  }

  setHeadsail(headsail: string): void {
    const trimmed = headsail.trim();
    if (!trimmed) {
      return;
    }
    this.write({ ...this.selectionSignal(), headsail: trimmed });
  }

  private write(selection: CurrentSailSelection): void {
    this.selectionSignal.set(selection);
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(selection));
    } catch {
      /* private mode and full storage can refuse the write */
    }
    this.changedSubject.next();
    if (selection.main || selection.headsail) {
      this.requestNotificationPermission();
    }
  }

  private requestNotificationPermission(): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') {
      return;
    }
    void Notification.requestPermission();
  }

  private read(): CurrentSailSelection {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) {
        return { ...EMPTY_CURRENT_SAILS };
      }
      const parsed = JSON.parse(raw) as Partial<CurrentSailSelection>;
      return {
        main: isMainReef(parsed.main) ? parsed.main : '',
        headsail: typeof parsed.headsail === 'string' ? parsed.headsail.trim() : '',
      };
    } catch {
      return { ...EMPTY_CURRENT_SAILS };
    }
  }

  private storageKey(): string {
    return `${STORAGE_KEY}:${this.vesselContext.vesselSlug}`;
  }
}
