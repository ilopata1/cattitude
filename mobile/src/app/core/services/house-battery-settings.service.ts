import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  DEFAULT_HOUSE_BATTERY_PERCENT,
  houseBatteryPercentFromText,
} from '../levels/house-battery';

export const HOUSE_BATTERY_PERCENT_KEY = 'cattitude.houseBattery.percent';

@Injectable({ providedIn: 'root' })
export class HouseBatterySettingsService {
  private readonly subject = new BehaviorSubject<number>(this.read());
  readonly percent$ = this.subject.asObservable();
  private readonly localChangeSubject = new Subject<void>();
  /** Only changes made on this device, which go to the boat for everyone. */
  readonly localChange$ = this.localChangeSubject.asObservable();

  get percent(): number {
    return this.subject.value;
  }

  save(percent: number): void {
    const before = this.subject.value;
    this.store(percent);
    if (this.subject.value !== before) this.localChangeSubject.next();
  }

  /** Whether someone set the value on this device, rather than the default. */
  isSaved(): boolean {
    try {
      return localStorage.getItem(HOUSE_BATTERY_PERCENT_KEY) != null;
    } catch {
      return false;
    }
  }

  /** The boat's shared value, set on another device. */
  adopt(percent: number): void {
    if (percent === this.subject.value) return;
    this.store(percent);
  }

  private store(percent: number): void {
    const parsed = houseBatteryPercentFromText(String(percent));
    const clean = parsed.error ? DEFAULT_HOUSE_BATTERY_PERCENT : parsed.percent;
    try {
      localStorage.setItem(HOUSE_BATTERY_PERCENT_KEY, JSON.stringify(clean));
    } catch {
      /* this session still uses the value below */
    }
    this.subject.next(clean);
  }

  private read(): number {
    try {
      const stored = localStorage.getItem(HOUSE_BATTERY_PERCENT_KEY);
      if (stored == null) return DEFAULT_HOUSE_BATTERY_PERCENT;
      const parsed = houseBatteryPercentFromText(String(JSON.parse(stored)));
      return parsed.error ? DEFAULT_HOUSE_BATTERY_PERCENT : parsed.percent;
    } catch {
      return DEFAULT_HOUSE_BATTERY_PERCENT;
    }
  }
}
