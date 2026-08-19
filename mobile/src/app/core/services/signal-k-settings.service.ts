import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const STORAGE_KEY = 'cattitude.signalk.url';

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
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }
}
