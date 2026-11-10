import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { houseBatteryNotice, houseChargePercent } from '../levels/house-battery';
import { LevelsState } from '../levels/levels';
import { HouseBatterySettingsService } from './house-battery-settings.service';
import { LevelsService } from './levels.service';
import { NotificationBridgeService } from './notification-bridge.service';
import { NotificationPreferenceService } from './notification-preference.service';

/**
 * Raises one alert when the house battery charge on Levels falls under the
 * Settings percentage. It stays quiet until the charge recovers.
 */
@Injectable({ providedIn: 'root' })
export class HouseBatteryWatchService {
  private readonly levels = inject(LevelsService);
  private readonly settings = inject(HouseBatterySettingsService);
  private readonly notifications = inject(NotificationBridgeService);
  private readonly preferences = inject(NotificationPreferenceService);
  private latched = false;
  private started = false;
  private subs: Subscription[] = [];

  ensureRunning(): void {
    if (this.started) return;
    this.started = true;
    this.subs.push(
      this.levels.state$.subscribe((state) => this.evaluate(state)),
      this.settings.percent$.subscribe(() => this.evaluate(this.levels.current)),
      this.preferences.enabled$.subscribe(() => this.evaluate(this.levels.current)),
    );
  }

  private evaluate(state: LevelsState): void {
    if (!this.preferences.enabled()) {
      this.latched = false;
      return;
    }
    if (houseChargePercent(state) == null) return;
    const notice = houseBatteryNotice(state, this.settings.percent);
    if (!notice) {
      this.latched = false;
      return;
    }
    if (this.latched) return;
    this.latched = true;
    this.notifications.notifyAppEvent('house-battery.low', notice.title, notice.body);
  }
}
