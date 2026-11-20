import { Injectable, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { formatCurrentSails, normalizeSailConfiguration, sailPlansDiffer } from '../guide/current-sail';
import { holdSailAdvice } from '../logbook/logbook-math';
import { POLAR_WINDOW_MINUTES, PolarWindowMinutes } from '../models/polar.model';
import { CurrentSailService } from './current-sail.service';
import { LogbookSamplerService } from './logbook-sampler.service';
import { NotificationBridgeService } from './notification-bridge.service';
import { PolarService } from './polar.service';
import { SailPlanService } from './sail-plan.service';
import { decideSailWindows } from './sail-watch';

/**
 * Compares the sails the crew entered with the 15-, 30-, and 60-minute polar
 * recommendations. Samples are kept on the boat, so the windows keep filling
 * while this app is closed. A longer window stays quiet until every shorter
 * window is covered. Each window notifies on its own. Advice waits until she
 * has way on, and stays quiet while she is moored or anchored.
 */
@Injectable({ providedIn: 'root' })
export class SailWatchService {
  private readonly polar = inject(PolarService);
  private readonly currentSails = inject(CurrentSailService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly sailPlans = inject(SailPlanService);
  private readonly notifications = inject(NotificationBridgeService);
  private readonly lastNotified = new Map<PolarWindowMinutes, string | null>();
  private started = false;
  private subs: Subscription[] = [];

  ensureRunning(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.polar.start();
    void this.sampler.start();
    this.subs.push(
      this.polar.windows$.subscribe(() => this.evaluate()),
      this.sailPlans.plan$.subscribe(() => this.evaluate()),
      this.currentSails.changed$.subscribe(() => this.evaluate()),
      this.sampler.reading$.subscribe(() => this.evaluate()),
    );
  }

  private evaluate(): void {
    if (holdSailAdvice(this.sampler.snapshot)) {
      return;
    }
    const plan = this.sailPlans.plan;
    const current = this.currentSails.selection();
    const snapshots = POLAR_WINDOW_MINUTES.map(minutes => {
      const covered = this.polar.windowCovered(minutes);
      const average = this.polar.windows[minutes];
      const advice = covered
        ? this.sailPlans.advise(average.twaDeg, average.twsKnots, average.polarPct)
        : null;
      const recommended = advice && !advice.empty ? advice.primary : '';
      return {
        minutes,
        covered,
        sailsDiffer: covered && sailPlansDiffer(current, recommended, plan),
        recommendedKey: normalizeSailConfiguration(recommended),
        recommended,
      };
    });
    const decisions = decideSailWindows(snapshots, this.lastNotified);
    decisions.forEach((decision, index) => {
      this.lastNotified.set(decision.minutes, decision.remembered);
      if (!decision.notify) {
        return;
      }
      const recommended = snapshots[index].recommended.trim();
      this.notifications.notifyAppEvent(
        `sail-plan.mismatch.${decision.minutes}`,
        'Sail plan',
        `${decision.minutes}-minute average suggests ${recommended}. You have ${formatCurrentSails(current)} up.`,
      );
    });
  }
}
