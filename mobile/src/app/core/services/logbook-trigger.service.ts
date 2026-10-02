import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { formatCurrentSails } from '../guide/current-sail';
import { enginesRunning } from '../logbook/logbook-ingest';
import {
  anchoringPauseActive,
  derivePropulsion,
  destinationDistanceNm,
  intervalDue,
  propulsionTriggerFor,
  readingUsable,
  sailsUp,
} from '../logbook/logbook-math';
import { PropulsionState } from '../models/logbook.model';
import { CurrentSailService } from './current-sail.service';
import { LogbookSamplerService } from './logbook-sampler.service';
import { LogbookService } from './logbook.service';

/**
 * Writes log entries while the app is open: on the clock, after the sails
 * settle, and after the engine or anchor state holds steady.
 */
@Injectable({ providedIn: 'root' })
export class LogbookTriggerService implements OnDestroy {
  private readonly logbook = inject(LogbookService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly sails = inject(CurrentSailService);

  private started = false;
  private busy = false;
  private subs: Subscription[] = [];
  private stable: PropulsionState | null = null;
  private pending: PropulsionState | null = null;
  private pendingSince = 0;
  private stateSince = 0;
  private sailDirtyAt: number | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;

  ensureRunning(): void {
    if (this.started) return;
    this.started = true;
    void this.logbook.ensureReady()
      .then(() => this.sampler.start())
      .catch(() => undefined);
    this.subs.push(
      this.sampler.tick$.subscribe(() => void this.evaluate()),
      this.sails.changed$.subscribe(() => {
        this.sailDirtyAt = Date.now();
      }),
    );
    this.clock = setInterval(() => void this.evaluate(), 30_000);
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
    if (this.clock) clearInterval(this.clock);
  }

  private async evaluate(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.logbook.ensureReady();
      const reading = this.sampler.snapshot;
      if (!readingUsable(reading)) return;
      const now = Date.now();
      const selection = this.sails.selection();
      const state = derivePropulsion({
        navState: reading.navState,
        enginesRunning: enginesRunning(reading),
        sailsUp: sailsUp(selection.main, selection.headsail),
        sogKn: reading.sogKn,
      });
      if (this.stable == null) {
        this.stable = state;
        this.stateSince = now;
      } else if (state !== this.stable) {
        if (this.pending !== state) {
          this.pending = state;
          this.pendingSince = now;
          this.stateSince = now;
        }
      } else {
        this.pending = null;
      }

      if (await this.passArrivedWaypoint(reading.position)) return;
      if (await this.maybePropulsion(state, now)) return;
      if (await this.maybeSails(now)) return;
      await this.maybeInterval(state, now);
    } catch {
      /* A failed read is retried on the next tick. */
    } finally {
      this.busy = false;
    }
  }

  private async passArrivedWaypoint(
    position: { lat: number; lon: number } | null,
  ): Promise<boolean> {
    const passage = this.logbook.passage$.value;
    if (!passage || !position) return false;
    const next = passage.waypoints.find(waypoint => !waypoint.passedAt);
    if (!next) return false;
    const distance = destinationDistanceNm(position, {
      ...passage,
      destinationLat: next.lat,
      destinationLon: next.lon,
    });
    const radius = passage.arrivalRadiusNm > 0 ? passage.arrivalRadiusNm : 0.3;
    if (distance == null || distance > radius) return false;
    await this.logbook.record('waypoint', { waypointId: next.id, force: true });
    return true;
  }

  private async maybePropulsion(state: PropulsionState, now: number): Promise<boolean> {
    if (!this.pending || this.stable == null) return false;
    const wait = this.logbook.settings$.value.propulsionDebounceMin * 60_000;
    if (now - this.pendingSince < wait) return false;
    if (state !== this.pending) return false;
    const passage = this.logbook.passage$.value;
    const distance = destinationDistanceNm(this.sampler.snapshot.position, passage);
    const trigger = propulsionTriggerFor(this.stable, state, passage, distance);
    const entry = await this.logbook.record(trigger, { force: true });
    if (entry) {
      this.stable = state;
      this.pending = null;
    }
    return !!entry;
  }

  private async maybeSails(now: number): Promise<boolean> {
    if (this.sailDirtyAt == null) return false;
    const wait = this.logbook.settings$.value.sailDebounceMin * 60_000;
    if (now - this.sailDirtyAt < wait) return false;
    const label = formatCurrentSails(this.sails.selection());
    const last = this.logbook.entries$.value[0];
    if ((last && last.sails.label === label) || (!last && !label)) {
      this.sailDirtyAt = null;
      return false;
    }
    const entry = await this.logbook.record('sail-change');
    if (entry) this.sailDirtyAt = null;
    return !!entry;
  }

  private async maybeInterval(state: PropulsionState, now: number): Promise<void> {
    const settings = this.logbook.settings$.value;
    if (anchoringPauseActive(state, this.stateSince, now, settings.pauseWhenAnchored)) return;
    const lastInterval = this.logbook.entries$.value.find(entry => entry.trigger === 'interval');
    const lastMs = lastInterval ? Date.parse(lastInterval.at) : 0;
    if (!intervalDue(now, lastMs, settings.intervalHours, settings.offsetMinutes)) return;
    await this.logbook.record('interval');
  }
}
