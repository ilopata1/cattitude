import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  FuelCurveSettings,
  emptyFuelCurve,
  normalizeFuelCurve,
} from '../fuel/fuel-range';

export const FUEL_CURVE_STORAGE_KEY = 'cattitude.fuelCurve.v1';

@Injectable({ providedIn: 'root' })
export class FuelCurveSettingsService {
  private readonly subject = new BehaviorSubject<FuelCurveSettings>(this.read());
  readonly settings$ = this.subject.asObservable();

  get current(): FuelCurveSettings {
    return this.subject.value;
  }

  save(next: FuelCurveSettings): void {
    const clean = normalizeFuelCurve(next);
    try {
      localStorage.setItem(FUEL_CURVE_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* the gauge still follows this session */
    }
    this.subject.next(clean);
  }

  private read(): FuelCurveSettings {
    try {
      const stored = localStorage.getItem(FUEL_CURVE_STORAGE_KEY);
      if (!stored) return emptyFuelCurve();
      return normalizeFuelCurve(JSON.parse(stored) as unknown);
    } catch {
      return emptyFuelCurve();
    }
  }
}
