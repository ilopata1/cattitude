/**
 * PolarService
 *
 * Loads a vessel polar (.pol), subscribes to Signal-K for STW/TWS/TWA,
 * computes instantaneous and rolling-average percentage-of-polar performance.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, firstValueFrom, interval } from 'rxjs';
import { SignalKService, SignalKDelta } from './signal-k.service';
import { interpolateTargetSpeed, parsePolarFile, targetCurveAtTws } from './polar-parser';
import {
  PolarCurvePoint,
  PolarLiveState,
  PolarSample,
  PolarTable,
  PolarWindowMinutes,
} from '../models/polar.model';

const DEFAULT_POLAR_ASSET = 'assets/polars/outremer-55sc.pol';
const BUFFER_MS = 15 * 60 * 1000;
const SAMPLE_INTERVAL_MS = 1_000;
const STALE_AFTER_MS = 15_000;
const MPS_TO_KNOTS = 1.94384;
const RAD_TO_DEG = 180 / Math.PI;

const EMPTY_LIVE: PolarLiveState = {
  stwKnots: null,
  twsKnots: null,
  twaDeg: null,
  targetKnots: null,
  instantPolarPct: null,
  lastUpdate: null,
  stale: true,
};

interface SkPartial {
  stwMps?: number;
  sogMps?: number;
  twsMps?: number;
  twaRad?: number;
  lastSeen: number;
}

@Injectable({ providedIn: 'root' })
export class PolarService implements OnDestroy {

  private table: PolarTable | null = null;
  private polarFilename = 'outremer-55sc.pol';
  private samples: PolarSample[] = [];
  private partial: SkPartial = { lastSeen: 0 };
  private sub: Subscription | null = null;
  private tickSub: Subscription | null = null;
  private lastSampleAt = 0;

  private readonly liveSubject = new BehaviorSubject<PolarLiveState>(EMPTY_LIVE);
  private readonly pct5Subject  = new BehaviorSubject<number | null>(null);
  private readonly pct10Subject = new BehaviorSubject<number | null>(null);
  private readonly pct15Subject = new BehaviorSubject<number | null>(null);

  readonly live$ = this.liveSubject.asObservable();
  readonly polarFilename$ = new BehaviorSubject<string>(this.polarFilename);

  constructor(
    private readonly http: HttpClient,
    private readonly sk: SignalKService,
  ) {
    void this.loadDefaultPolar();
    this.start();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Load the bundled default polar on startup. */
  async loadDefaultPolar(): Promise<void> {
    await this.loadPolar(DEFAULT_POLAR_ASSET, 'outremer-55sc.pol');
  }

  /** Fetch and parse a `.pol` file from the given asset or URL path. */
  async loadPolar(path: string, filename: string): Promise<void> {
    const text = await firstValueFrom(this.http.get(path, { responseType: 'text' }));
    if (!text) throw new Error(`Polar file not found: ${path}`);
    this.table = parsePolarFile(text);
    this.polarFilename = filename;
    this.polarFilename$.next(filename);
    this.samples = [];
    this.refreshRollingAverages();
  }

  polarPct$(window: PolarWindowMinutes): Observable<number | null> {
    switch (window) {
      case 5:  return this.pct5Subject.asObservable();
      case 10: return this.pct10Subject.asObservable();
      case 15: return this.pct15Subject.asObservable();
    }
  }

  /** Target-speed curve at the current (or supplied) TWS for chart rendering. */
  targetCurve(twsKnots: number | null): PolarCurvePoint[] {
    if (!this.table || twsKnots === null) return [];
    return targetCurveAtTws(twsKnots, this.table);
  }

  get loaded(): boolean {
    return this.table !== null;
  }

  start(): void {
    this.stop();
    this.sub = this.sk.delta$.subscribe(delta => this.handleDelta(delta));
    this.tickSub = interval(1_000).subscribe(() => this.onTick());
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.tickSub?.unsubscribe();
    this.sub = null;
    this.tickSub = null;
  }

  // ---------------------------------------------------------------------------

  private handleDelta(delta: SignalKDelta): void {
    const ctx = delta.context ?? '';
    if (ctx.startsWith('vessels.') && this.sk.self && ctx !== this.sk.self) return;

    this.partial.lastSeen = Date.now();

    for (const update of delta.updates ?? []) {
      for (const kv of update.values ?? []) {
        this.applyPath(kv.path, kv.value);
      }
    }

    this.publishLive();
    this.maybeRecordSample();
  }

  private applyPath(path: string, value: unknown): void {
    switch (path) {
      case 'navigation.speedThroughWater':
        if (typeof value === 'number') this.partial.stwMps = value;
        break;
      case 'navigation.speedOverGround':
        if (typeof value === 'number') this.partial.sogMps = value;
        break;
      case 'environment.wind.speedTrue':
        if (typeof value === 'number') this.partial.twsMps = value;
        break;
      case 'environment.wind.speedApparent':
        if (typeof value === 'number' && this.partial.twsMps === undefined) this.partial.twsMps = value;
        break;
      case 'environment.wind.angleTrueWater':
        if (typeof value === 'number') this.partial.twaRad = value;
        break;
      case 'environment.wind.angleApparent':
        if (typeof value === 'number' && this.partial.twaRad === undefined) this.partial.twaRad = value;
        break;
    }
  }

  private publishLive(): void {
    const stwKnots = this.toKnots(this.partial.stwMps ?? this.partial.sogMps);
    const twsKnots = this.toKnots(this.partial.twsMps);
    const twaDeg   = this.partial.twaRad !== undefined
      ? Math.abs(this.partial.twaRad * RAD_TO_DEG)
      : null;

    let targetKnots: number | null = null;
    let instantPolarPct: number | null = null;

    if (this.table && stwKnots !== null && twsKnots !== null && twaDeg !== null) {
      targetKnots = interpolateTargetSpeed(twaDeg, twsKnots, this.table);
      if (targetKnots > 0) {
        instantPolarPct = (stwKnots / targetKnots) * 100;
      }
    }

    const lastUpdate = this.partial.lastSeen || null;
    const stale = !lastUpdate || (Date.now() - lastUpdate > STALE_AFTER_MS);

    this.liveSubject.next({
      stwKnots,
      twsKnots,
      twaDeg,
      targetKnots,
      instantPolarPct,
      lastUpdate,
      stale,
    });
  }

  private maybeRecordSample(): void {
    if (!this.table) return;

    const now = Date.now();
    if (now - this.lastSampleAt < SAMPLE_INTERVAL_MS) return;

    const live = this.liveSubject.value;
    if (
      live.stwKnots === null ||
      live.twsKnots === null ||
      live.twaDeg === null ||
      live.targetKnots === null ||
      live.instantPolarPct === null ||
      live.stale
    ) {
      return;
    }

    this.lastSampleAt = now;
    this.samples.push({
      timestamp: now,
      stwKnots: live.stwKnots,
      twsKnots: live.twsKnots,
      twaDeg: live.twaDeg,
      targetKnots: live.targetKnots,
      polarPct: live.instantPolarPct,
    });

    this.pruneSamples(now);
    this.refreshRollingAverages();
  }

  private onTick(): void {
    const live = this.liveSubject.value;
    const stale = !live.lastUpdate || (Date.now() - live.lastUpdate > STALE_AFTER_MS);
    if (stale !== live.stale) {
      this.liveSubject.next({ ...live, stale });
    }
    this.pruneSamples(Date.now());
    this.refreshRollingAverages();
  }

  private pruneSamples(now: number): void {
    const cutoff = now - BUFFER_MS;
    if (this.samples.length === 0) return;
    let start = 0;
    while (start < this.samples.length && this.samples[start].timestamp < cutoff) {
      start++;
    }
    if (start > 0) {
      this.samples = this.samples.slice(start);
    }
  }

  private refreshRollingAverages(): void {
    const now = Date.now();
    this.pct5Subject.next(this.averagePct(now, 5));
    this.pct10Subject.next(this.averagePct(now, 10));
    this.pct15Subject.next(this.averagePct(now, 15));
  }

  private averagePct(now: number, minutes: PolarWindowMinutes): number | null {
    const cutoff = now - minutes * 60 * 1000;
    const windowSamples = this.samples.filter(s => s.timestamp >= cutoff);
    if (windowSamples.length === 0) return null;
    const sum = windowSamples.reduce((acc, s) => acc + s.polarPct, 0);
    return sum / windowSamples.length;
  }

  private toKnots(mps: number | undefined): number | null {
    if (mps === undefined || !Number.isFinite(mps)) return null;
    return mps * MPS_TO_KNOTS;
  }
}
