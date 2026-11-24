import { Injectable, OnDestroy, inject } from '@angular/core';
import { DutyRotaService } from './duty-rota.service';
import { InspectionService } from './inspection.service';
import { LogbookService } from './logbook.service';
import { LogbookTriggerService } from './logbook-trigger.service';
import { SailPlanService } from './sail-plan.service';

/**
 * Fetches data that other devices change, so a phone left open for days still sees it.
 * The boat is read every 30 s by LogbookTriggerService, on the boat network.
 * Railway goes over the internet (often a satellite link at sea), so it is read only
 * when the app comes back on screen and every 10 minutes while it is open.
 */
export const RAILWAY_REFRESH_MS = 10 * 60_000;
/** Coming back sooner than this after the last fetch does not fetch again. */
export const RETURN_MIN_GAP_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class SharedRefreshService implements OnDestroy {
  private readonly duty = inject(DutyRotaService);
  private readonly inspections = inject(InspectionService);
  private readonly logbook = inject(LogbookService);
  private readonly trigger = inject(LogbookTriggerService);
  private readonly sailPlans = inject(SailPlanService);

  private started = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRun = Date.now();
  private running = false;

  private readonly onVisible = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    this.trigger.poke();
    if (Date.now() - this.lastRun >= RETURN_MIN_GAP_MS) void this.refresh();
  };

  start(): void {
    if (this.started) return;
    this.started = true;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisible);
      document.addEventListener('resume', this.onVisible);
    }
    this.timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void this.refresh();
    }, RAILWAY_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisible);
      document.removeEventListener('resume', this.onVisible);
    }
    if (this.timer) clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lastRun = Date.now();
    try {
      const quiet = (work: Promise<void>) => work.catch(() => undefined);
      await Promise.all([
        quiet(this.duty.refresh()),
        quiet(this.inspections.refresh()),
        quiet(this.sailPlans.refresh()),
        quiet(this.logbook.refreshShared()),
      ]);
    } finally {
      this.running = false;
    }
  }
}
