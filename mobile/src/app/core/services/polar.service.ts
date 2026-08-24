/**
 * PolarService
 *
 * Loads a vessel polar (.pol), subscribes to Signal-K for boat speed/TWS/TWA,
 * and computes instantaneous plus 5/10/15-minute mean TWA, TWS, and polar %.
 *
 * Boat speed prefers navigation.speedThroughWater; falls back to
 * navigation.speedOverGround when STW is missing or effectively zero.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, firstValueFrom, interval } from 'rxjs';
import { SignalKService, SignalKDelta } from './signal-k.service';
import { interpolateTargetSpeed, parsePolarFile, targetCurveAtTws } from './polar-parser';
import {
  PolarBoatSpeedSource,
  PolarCurvePoint,
  PolarLiveState,
  PolarSample,
  PolarTable,
  PolarWindowAverages,
  PolarWindowMinutes,
  PolarWindowSet,
} from '../models/polar.model';

const DEFAULT_POLAR_ASSET = 'assets/polars/outremer-55sc.pol';
const BUFFER_MS = 15 * 60 * 1000;
const SAMPLE_INTERVAL_MS = 1_000;
const STALE_AFTER_MS = 15_000;

const EMPTY_WINDOW: PolarWindowAverages = {
  twaDeg: null,
  twsKnots: null,
  polarPct: null,
  sampleCount: 0,
};

const EMPTY_WINDOWS: PolarWindowSet = {
  5: EMPTY_WINDOW,
  10: EMPTY_WINDOW,
  15: EMPTY_WINDOW,
};
const MPS_TO_KNOTS = 1.94384;
const RAD_TO_DEG = 180 / Math.PI;
/** Below this, a published STW is treated as "no sensor" so SOG can win. */
const STW_MIN_USEFUL_MPS = 0.05;

const EMPTY_LIVE: PolarLiveState = {
  stwKnots: null,
  boatSpeedSource: null,
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
  twaWaterRad?: number;
  twaGroundRad?: number;
  twaApparentRad?: number;
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
  private readonly samplesSubject = new BehaviorSubject<PolarSample[]>([]);
  private readonly windowsSubject = new BehaviorSubject<PolarWindowSet>(EMPTY_WINDOWS);

  readonly live$ = this.liveSubject.asObservable();
  readonly samples$ = this.samplesSubject.asObservable();
  /** 5/10/15-minute mean TWA, TWS, and polar %. */
  readonly windows$ = this.windowsSubject.asObservable();
  readonly polarFilename$ = new BehaviorSubject<string>(this.polarFilename);

  get windows(): PolarWindowSet {
    return this.windowsSubject.value;
  }

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
    this.samplesSubject.next([]);
    this.refreshRollingAverages();
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
    const normalized = path.startsWith('self.') ? path.slice(5) : path;
    switch (normalized) {
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
        if (typeof value === 'number') this.partial.twaWaterRad = value;
        break;
      case 'environment.wind.angleTrueGround':
        if (typeof value === 'number') this.partial.twaGroundRad = value;
        break;
      case 'environment.wind.angleApparent':
        if (typeof value === 'number') this.partial.twaApparentRad = value;
        break;
    }
  }

  /**
   * Prefer STW for polar % (matches water-referenced polars). Use SOG when STW is
   * missing or effectively zero — common when no paddlewheel/log is installed.
   */
  private resolveBoatSpeed(): { knots: number | null; source: PolarBoatSpeedSource | null } {
    const stw = this.partial.stwMps;
    const sog = this.partial.sogMps;
    if (stw !== undefined && Number.isFinite(stw) && Math.abs(stw) >= STW_MIN_USEFUL_MPS) {
      return { knots: stw * MPS_TO_KNOTS, source: 'stw' };
    }
    if (sog !== undefined && Number.isFinite(sog)) {
      return { knots: sog * MPS_TO_KNOTS, source: 'sog' };
    }
    if (stw !== undefined && Number.isFinite(stw)) {
      return { knots: stw * MPS_TO_KNOTS, source: 'stw' };
    }
    return { knots: null, source: null };
  }

  private publishLive(): void {
    const boat = this.resolveBoatSpeed();
    const stwKnots = boat.knots;
    const twsKnots = this.toKnots(this.partial.twsMps);
    const twaRad =
      this.partial.twaWaterRad ??
      this.partial.twaGroundRad ??
      this.partial.twaApparentRad;
    const twaDeg = twaRad !== undefined ? Math.abs(twaRad * RAD_TO_DEG) : null;

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
      boatSpeedSource: boat.source,
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
    this.samplesSubject.next(this.samples.slice());
    this.refreshRollingAverages();
  }

  private onTick(): void {
    const live = this.liveSubject.value;
    const stale = !live.lastUpdate || (Date.now() - live.lastUpdate > STALE_AFTER_MS);
    if (stale !== live.stale) {
      this.liveSubject.next({ ...live, stale });
    }
    const before = this.samples.length;
    this.pruneSamples(Date.now());
    if (this.samples.length !== before) {
      this.samplesSubject.next(this.samples.slice());
    }
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
    this.windowsSubject.next({
      5: this.averageWindow(now, 5),
      10: this.averageWindow(now, 10),
      15: this.averageWindow(now, 15),
    });
  }

  private averageWindow(now: number, minutes: PolarWindowMinutes): PolarWindowAverages {
    const cutoff = now - minutes * 60 * 1000;
    const windowSamples = this.samples.filter(s => s.timestamp >= cutoff);
    if (windowSamples.length === 0) return EMPTY_WINDOW;
    const n = windowSamples.length;
    let twa = 0;
    let tws = 0;
    let pct = 0;
    for (const s of windowSamples) {
      twa += s.twaDeg;
      tws += s.twsKnots;
      pct += s.polarPct;
    }
    return {
      twaDeg: twa / n,
      twsKnots: tws / n,
      polarPct: pct / n,
      sampleCount: n,
    };
  }

  private toKnots(mps: number | undefined): number | null {
    if (mps === undefined || !Number.isFinite(mps)) return null;
    return mps * MPS_TO_KNOTS;
  }
}
