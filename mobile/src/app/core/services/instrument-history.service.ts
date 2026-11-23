import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { passageIsActive } from '../logbook/logbook-math';
import {
  EMPTY_SAIL_ESSENTIALS,
  EMPTY_WIND_STEER,
  SailEssentialsLive,
  WindSteerLive,
} from '../models/instrument-map.model';
import { Passage } from '../models/logbook.model';
import {
  HISTORY_SAMPLE_MS,
  HistoryRole,
  applyHistorySample,
  historySample,
} from './instrument-history';
import { InstrumentLiveService } from './instrument-live.service';
import { LogbookSamplerService } from './logbook-sampler.service';
import { LogbookService } from './logbook.service';

/**
 * In-memory trace of the live display, about ten minutes per role.
 * It reads wind, essentials, the live fix, and the passage. It does not
 * write back into InstrumentLiveService or the logbook.
 */
@Injectable({ providedIn: 'root' })
export class InstrumentHistoryService implements OnDestroy {
  private readonly live = inject(InstrumentLiveService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly logbook = inject(LogbookService);
  private readonly zone = inject(NgZone);
  private readonly traces = signal<Partial<Record<HistoryRole, readonly number[]>>>({});
  private essentials: SailEssentialsLive = EMPTY_SAIL_ESSENTIALS;
  private wind: WindSteerLive = EMPTY_WIND_STEER;
  private vmcKey: string | null = null;
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
      this.logbook.passage$.subscribe(passage => this.notePassage(passage)),
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

  /** A new destination must not continue the previous VMC trace. */
  private notePassage(passage: Passage | null): void {
    const key = passageIsActive(passage)
      ? `${passage!.destinationLat},${passage!.destinationLon}`
      : null;
    if (key === this.vmcKey) return;
    this.vmcKey = key;
    this.zone.run(() => {
      this.traces.update(current => {
        if (current.vmc == null) return current;
        const next = { ...current };
        delete next.vmc;
        return next;
      });
    });
  }

  private capture(): void {
    const position = this.sampler.snapshot.position;
    const sample = historySample({
      essentials: this.essentials,
      wind: this.wind,
      position,
      passage: this.logbook.passage$.value,
    });
    if (!Object.keys(sample).length) return;
    this.zone.run(() => {
      this.traces.update(current => applyHistorySample(current, sample));
    });
  }
}
