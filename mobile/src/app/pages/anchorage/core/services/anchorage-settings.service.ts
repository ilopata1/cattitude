import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnchorageSettings, DEFAULT_ANCHORAGE_SETTINGS } from '../models/anchorage.model';

const STORAGE_KEY = 'cattitude.anchorage.settings';

@Injectable({ providedIn: 'root' })
export class AnchorageSettingsService {
  private subject = new BehaviorSubject<AnchorageSettings>(this.load());
  readonly settings$ = this.subject.asObservable();

  get(): AnchorageSettings {
    return this.subject.value;
  }

  update(partial: Partial<AnchorageSettings>): void {
    const next = { ...this.subject.value, ...partial };
    this.subject.next(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  private load(): AnchorageSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AnchorageSettings> & { ownMmsi?: string };
        delete parsed.ownMmsi;
        return { ...DEFAULT_ANCHORAGE_SETTINGS, ...parsed };
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_ANCHORAGE_SETTINGS };
  }
}
