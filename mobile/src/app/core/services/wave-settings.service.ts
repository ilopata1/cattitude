import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  WaveBoatSettings,
  defaultWaveSettings,
  normalizeWaveSettings,
} from '../waves/wave-settings';

export const WAVE_SETTINGS_KEY = 'cattitude.waves.v1';

@Injectable({ providedIn: 'root' })
export class WaveSettingsService {
  private readonly subject = new BehaviorSubject<WaveBoatSettings>(this.read());
  readonly settings$ = this.subject.asObservable();

  get current(): WaveBoatSettings {
    return this.subject.value;
  }

  save(next: WaveBoatSettings): void {
    const clean = normalizeWaveSettings(next);
    try {
      localStorage.setItem(WAVE_SETTINGS_KEY, JSON.stringify(clean));
    } catch {
      /* this session still uses the values just entered */
    }
    this.subject.next(clean);
  }

  private read(): WaveBoatSettings {
    try {
      const stored = localStorage.getItem(WAVE_SETTINGS_KEY);
      if (!stored) return defaultWaveSettings();
      return normalizeWaveSettings(JSON.parse(stored) as unknown);
    } catch {
      return defaultWaveSettings();
    }
  }
}
