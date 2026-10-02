import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { normalizeSailConfiguration, sailPlansDiffer } from '../guide/current-sail';
import { CurrentSailService } from './current-sail.service';
import { NotificationBridgeService } from './notification-bridge.service';
import { PolarService } from './polar.service';
import { SailPlanService } from './sail-plan.service';

/**
 * Compares the sails the crew entered with the 15-minute polar recommendation.
 * Polar sampling starts with this service, so it continues on every screen
 * for as long as the app process is alive.
 */
@Injectable({ providedIn: 'root' })
export class SailWatchService {
  private readonly polar = inject(PolarService);
  private readonly currentSails = inject(CurrentSailService);
  private readonly sailPlans = inject(SailPlanService);
  private readonly notifications = inject(NotificationBridgeService);
  private lastNotified: string | null = null;
  private started = false;
  private subs: Subscription[] = [];

  ensureRunning(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.polar.start();
    this.subs.push(
      this.polar.windows$.subscribe(() => this.evaluate()),
      this.sailPlans.plan$.subscribe(() => this.evaluate()),
      this.currentSails.changed$.subscribe(() => this.evaluate()),
    );
  }

  private evaluate(): void {
    const average = this.polar.windows[15];
    const advice = this.sailPlans.advise(average.twaDeg, average.twsKnots, average.polarPct);
    const recommended = advice && !advice.empty ? advice.primary : '';
    const current = this.currentSails.configuration();
    if (!sailPlansDiffer(current, recommended)) {
      this.lastNotified = null;
      return;
    }
    const key = normalizeSailConfiguration(recommended);
    if (this.lastNotified === key) {
      return;
    }
    this.lastNotified = key;
    this.notifications.notifyAppEvent(
      'sail-plan.mismatch',
      'Sail plan',
      `15-minute average suggests ${recommended.trim()}. You have ${current.trim()} up.`,
    );
  }
}
