/**
 * Wires the live Signal K stream, the logbook's set/drift and pressure, and
 * the sails the crew entered into the coach data-health report.
 */
import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import {
  COACH_INPUT_ORDER,
  CoachInputHealth,
  CoachInputId,
  CoachLedger,
  DatedFact,
  assessCoachInputs,
  emptyCoachLedger,
  logbookCurrentFact,
  logbookPressureArrivalMs,
  preferCoachHealth,
  recordCoachDelta,
} from '../coach/coach-inputs';
import {
  COACH_LOGBOOK_STALE_MS,
  COACH_RATE_WINDOW_MS,
  COACH_STREAM_STALE_MS,
} from '../coach/coach-settings';
import { CurrentSailService } from './current-sail.service';
import { LogbookSamplerService } from './logbook-sampler.service';
import { LogbookService } from './logbook.service';
import { SignalKDelta, SignalKService } from './signal-k.service';

@Injectable({ providedIn: 'root' })
export class CoachInputsService implements OnDestroy {
  private readonly sk = inject(SignalKService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly logbook = inject(LogbookService);
  private readonly sails = inject(CurrentSailService);

  private readonly healthSubject = new BehaviorSubject<CoachInputHealth[]>([]);
  readonly health$ = this.healthSubject.asObservable();

  private ledger: CoachLedger = emptyCoachLedger();
  private sailChanges: number[] = [];
  private readonly subs = new Subscription();

  constructor() {
    this.subs.add(this.sk.delta$.subscribe(delta => {
      if (!this.ownVessel(delta)) return;
      const next = recordCoachDelta(this.ledger, delta, Date.now());
      if (next !== this.ledger) this.ledger = next;
      this.publish();
    }));
    this.subs.add(this.sails.changed$.subscribe(() => {
      this.noteSailChange(Date.now());
      this.publish();
    }));
    this.subs.add(this.sampler.reading$.subscribe(() => this.publish()));
    this.subs.add(this.logbook.entries$.subscribe(() => this.publish()));
    this.subs.add(interval(1000).subscribe(() => this.publish()));
    this.publish();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private publish(): void {
    this.healthSubject.next(this.build(Date.now()));
  }

  private build(nowMs: number): CoachInputHealth[] {
    return COACH_INPUT_ORDER.map(id => {
      if (id === 'current') return this.currentRow(nowMs);
      if (id === 'sails') return this.sailRow(nowMs);
      if (id === 'pressure') return this.pressureRow(nowMs);
      return this.streamRow(id, this.ledger.arrivals[id] ?? [], nowMs);
    });
  }

  private pressureRow(nowMs: number): CoachInputHealth {
    const arrivals = [...(this.ledger.arrivals.pressure ?? [])];
    const reading = this.sampler.snapshot;
    if (reading.pressureHpa != null && reading.seen['pressure'] != null) {
      arrivals.push(reading.seen['pressure']);
    }
    const live = this.streamRow('pressure', arrivals, nowMs);
    const loggedAt = logbookPressureArrivalMs(this.logbook.entries$.value.map(entry => ({
      atMs: Date.parse(entry.at),
      pressureHpa: entry.pressureHpa,
    })));
    const logged = this.factRow('pressure', loggedAt == null ? [] : [loggedAt], COACH_LOGBOOK_STALE_MS, nowMs);
    return preferCoachHealth(live, logged);
  }

  private currentRow(nowMs: number): CoachInputHealth {
    const reading = this.sampler.snapshot;
    const fact: DatedFact | null = logbookCurrentFact(
      {
        setDeg: reading.setDeg,
        driftKn: reading.driftKn,
        setAtMs: reading.seen['set'] ?? null,
        driftAtMs: reading.seen['drift'] ?? null,
      },
      this.logbook.entries$.value.map(entry => ({
        atMs: Date.parse(entry.at),
        setDeg: entry.current?.setDeg ?? null,
        driftKn: entry.current?.driftKn ?? null,
      })),
    );
    if (!fact) return this.factRow('current', [], COACH_LOGBOOK_STALE_MS, nowMs);
    const staleAfter = fact.source === 'live' ? COACH_STREAM_STALE_MS : COACH_LOGBOOK_STALE_MS;
    return this.factRow('current', [fact.atMs], staleAfter, nowMs);
  }

  private sailRow(nowMs: number): CoachInputHealth {
    const up = this.sails.configuration().trim();
    if (!up) return this.factRow('sails', [], null, nowMs);
    if (this.sailChanges.length === 0) {
      return assessCoachInputs([{
        input: 'sails',
        arrivals: [],
        staleAfterMs: null,
        presentWithoutTime: true,
        rateWindowMs: COACH_RATE_WINDOW_MS,
      }], nowMs)[0];
    }
    return this.factRow('sails', this.sailChanges, null, nowMs);
  }

  private noteSailChange(nowMs: number): void {
    if (!this.sails.configuration().trim()) {
      this.sailChanges = [];
      return;
    }
    this.sailChanges = [...this.sailChanges, nowMs].slice(-50);
  }

  private streamRow(id: CoachInputId, arrivals: number[], nowMs: number): CoachInputHealth {
    return this.factRow(id, arrivals, COACH_STREAM_STALE_MS, nowMs);
  }

  private factRow(
    id: CoachInputId,
    arrivals: number[],
    staleAfterMs: number | null,
    nowMs: number,
  ): CoachInputHealth {
    return assessCoachInputs([{
      input: id,
      arrivals,
      staleAfterMs,
      rateWindowMs: COACH_RATE_WINDOW_MS,
    }], nowMs)[0];
  }

  private ownVessel(delta: SignalKDelta): boolean {
    const context = delta.context ?? '';
    return !(context.startsWith('vessels.') && this.sk.self && context !== this.sk.self);
  }
}
