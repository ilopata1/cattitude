import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const STORAGE_KEY = 'cattitude.signalk.url';
/** Used when no URL has been saved yet. */
export const DEFAULT_SIGNALK_URL = 'https://sailsupernova.com';

@Injectable({ providedIn: 'root' })
export class SignalKSettingsService {
  private urlSubject: BehaviorSubject<string>;

  readonly url$: Observable<string>;

  constructor() {
    const stored = this.readStored();
    this.urlSubject = new BehaviorSubject<string>(stored);
    this.url$ = this.urlSubject.asObservable();
  }

  get url(): string {
    return this.urlSubject.value;
  }

  setUrl(url: string): void {
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.urlSubject.next(trimmed);
  }

  clearUrl(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.urlSubject.next('');
  }

  private readStored(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)?.trim();
      return stored || DEFAULT_SIGNALK_URL;
    } catch {
      return DEFAULT_SIGNALK_URL;
    }
  }
}
