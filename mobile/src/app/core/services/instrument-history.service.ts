import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  EMPTY_SAIL_ESSENTIALS,
  EMPTY_WIND_STEER,
  SailEssentialsLive,
  WindSteerLive,
} from '../models/instrument-map.model';
import {
  HISTORY_SAMPLE_MS,
  HistoryRole,
  applyHistorySample,
  historySample,
} from './instrument-history';
import { InstrumentLiveService } from './instrument-live.service';

/**
 * In-memory trace of the live display, about ten minutes per role.
 * Subscribes to the public wind and essentials streams only. It does not
 * write back into InstrumentLiveService or the logbook.
 */
@Injectable({ providedIn: 'root' })
export class InstrumentHistoryService implements OnDestroy {
  private readonly live = inject(InstrumentLiveService);
  private readonly zone = inject(NgZone);
  private readonly traces = signal<Partial<Record<HistoryRole, readonly number[]>>>({});
  private essentials: SailEssentialsLive = EMPTY_SAIL_ESSENTIALS;
  private wind: WindSteerLive = EMPTY_WIND_STEER;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly subs: Subscription[] = [];

  constructor() {
    this.subs.push(
      this.live.essentials$.subscribe(value => {
        this.essentials = value;
      }),
      this.live.wind$.subscribe(value => {
        this.wind = value;
      }),
    );
    this.zone.runOutsideAngular(() => {
      this.capture();
      this.timer = setInterval(() => this.capture(), HISTORY_SAMPLE_MS);
    });
  }

  /** Last ~10 minutes for one role. Reading this in a template tracks the signal. */
  history(role: HistoryRole): readonly number[] {
    return this.traces()[role] ?? [];
  }

  ngOnDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.subs.forEach(sub => sub.unsubscribe());
  }

  private capture(): void {
    const sample = historySample({ essentials: this.essentials, wind: this.wind });
    if (!Object.keys(sample).length) return;
    this.zone.run(() => {
      this.traces.update(current => applyHistorySample(current, sample));
    });
  }
}
