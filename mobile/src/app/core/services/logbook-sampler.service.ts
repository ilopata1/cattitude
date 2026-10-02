import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, interval } from 'rxjs';
import { ingestSignalK } from '../logbook/logbook-ingest';
import { LiveReading, TrackSample, emptyReading } from '../models/logbook.model';
import { LogbookStoreService } from './logbook-store.service';
import { SignalKDelta, SignalKService } from './signal-k.service';

const SAMPLE_MS = 10_000;
const PERSIST_MS = 60_000;
const RETAIN_MS = 48 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class LogbookSamplerService implements OnDestroy {
  private readonly sk = inject(SignalKService);
  private readonly store = inject(LogbookStoreService);

  private readonly readingSubject = new BehaviorSubject<LiveReading>(emptyReading());
  private readonly tickSubject = new Subject<void>();
  readonly reading$ = this.readingSubject.asObservable();
  readonly tick$ = this.tickSubject.asObservable();

  private reading = emptyReading();
  private samples: TrackSample[] = [];
  private subs: Subscription[] = [];
  private started = false;
  private lastPersistAt = 0;

  get snapshot(): LiveReading {
    return this.reading;
  }

  samplesSince(sinceMs: number): TrackSample[] {
    return this.samples.filter(sample => sample.at >= sinceMs);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const cutoff = Date.now() - RETAIN_MS;
    try {
      this.samples = await this.store.samplesSince(cutoff);
    } catch {
      this.samples = [];
    }
    this.subs.push(
      this.sk.delta$.subscribe(delta => this.handleDelta(delta)),
      interval(SAMPLE_MS).subscribe(() => this.sample()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  private handleDelta(delta: SignalKDelta): void {
    const context = delta.context ?? '';
    if (context.startsWith('vessels.') && this.sk.self && context !== this.sk.self) return;
    let touched = false;
    for (const update of delta.updates ?? []) {
      const at = update.timestamp ? Date.parse(update.timestamp) : Date.now();
      const nowMs = Number.isFinite(at) ? at : Date.now();
      for (const kv of update.values ?? []) {
        ingestSignalK(this.reading, kv.path, kv.value, nowMs);
        touched = true;
      }
    }
    if (touched) this.readingSubject.next(this.reading);
  }

  private sample(): void {
    const now = Date.now();
    const reading = this.reading;
    const sample: TrackSample = {
      at: now,
      lat: reading.position?.lat ?? null,
      lon: reading.position?.lon ?? null,
      twsKn: reading.twsKn,
      pressureHpa: reading.pressureHpa,
      tripLogM: reading.tripLogM,
      sogKn: reading.sogKn,
    };
    const hasValue = sample.lat != null || sample.twsKn != null || sample.pressureHpa != null || sample.sogKn != null;
    if (hasValue) {
      this.samples.push(sample);
      this.pruneMemory(now);
    }
    this.tickSubject.next();
    if (hasValue && now - this.lastPersistAt >= PERSIST_MS) {
      this.lastPersistAt = now;
      void this.store.saveSample(sample).then(() => this.store.pruneSamples(now - RETAIN_MS)).catch(() => undefined);
    }
  }

  private pruneMemory(now: number): void {
    const cutoff = now - RETAIN_MS;
    if (this.samples.length && this.samples[0].at < cutoff) {
      this.samples = this.samples.filter(sample => sample.at >= cutoff);
    }
  }
}
