import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const STORAGE_KEY = 'cattitude.signalk.url';
const TOKEN_KEY = 'cattitude.signalk.token';
/** Used when no URL has been saved yet. */
export const DEFAULT_SIGNALK_URL = 'https://signalk.sailsupernova.com';

@Injectable({ providedIn: 'root' })
export class SignalKSettingsService {
  private urlSubject: BehaviorSubject<string>;
  private tokenSubject: BehaviorSubject<string>;

  readonly url$: Observable<string>;

  constructor() {
    const stored = this.readStored();
    this.urlSubject = new BehaviorSubject<string>(stored);
    this.url$ = this.urlSubject.asObservable();
    this.tokenSubject = new BehaviorSubject<string>(this.readToken());
  }

  get url(): string {
    return this.urlSubject.value;
  }

  get token(): string {
    return this.tokenSubject.value;
  }

  setToken(token: string): void {
    const trimmed = token.trim();
    if (trimmed) localStorage.setItem(TOKEN_KEY, trimmed);
    else localStorage.removeItem(TOKEN_KEY);
    this.tokenSubject.next(trimmed);
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

  private readToken(): string {
    try {
      return localStorage.getItem(TOKEN_KEY)?.trim() || '';
    } catch {
      return '';
    }
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
