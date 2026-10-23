/**
 * PolarService
 *
 * Loads a vessel polar (.pol) and computes instantaneous plus 5/10/15-minute
 * mean TWA, TWS, and polar % from the smoothed instrument readings.
 *
 * Boat speed, true wind, and apparent wind come from InstrumentLiveService,
 * which already prefers speed through water and ignores interspersed log zeros.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, combineLatest, firstValueFrom, interval } from 'rxjs';
import { interpolateTargetSpeed, parsePolarFile, targetCurveAtTws } from './polar-parser';
import {
  PolarCurvePoint,
  PolarLiveState,
  PolarSample,
  PolarTable,
  PolarWindowAverages,
  PolarWindowMinutes,
  PolarWindowSet,
} from '../models/polar.model';
import { EMPTY_SAIL_ESSENTIALS, EMPTY_WIND_STEER, SailEssentialsLive, WindSteerLive } from '../models/instrument-map.model';
import { InstrumentLiveService } from './instrument-live.service';

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

@Injectable({ providedIn: 'root' })
export class PolarService implements OnDestroy {

  private table: PolarTable | null = null;
  private polarFilename = 'outremer-55sc.pol';
  private samples: PolarSample[] = [];
  private wind: WindSteerLive = EMPTY_WIND_STEER;
  private essentials: SailEssentialsLive = EMPTY_SAIL_ESSENTIALS;
  /** Latched once each half of a wind pair has arrived, so a later calm 0 is kept. */
  private seenTwa = false;
  private seenTws = false;
  private seenAwa = false;
  private seenAws = false;
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
    private readonly instruments: InstrumentLiveService,
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
    this.sub = combineLatest([this.instruments.wind$, this.instruments.essentials$]).subscribe(
      ([wind, essentials]) => {
        this.wind = wind;
        this.essentials = essentials;
        if (wind.twaFresh) this.seenTwa = true;
        if (wind.twsFresh) this.seenTws = true;
        if (wind.awaFresh) this.seenAwa = true;
        if (wind.awsFresh) this.seenAws = true;
        this.publishLive();
      },
    );
    this.tickSub = interval(SAMPLE_INTERVAL_MS).subscribe(() => this.onTick());
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.tickSub?.unsubscribe();
    this.sub = null;
    this.tickSub = null;
  }

  // ---------------------------------------------------------------------------

  private publishLive(): void {
    const windReading = this.smoothedWind();
    const stwKnots = this.essentials.speedKn;
    const twsKnots = windReading.twsKnots;
    const twaDeg = windReading.twaDeg;

    let targetKnots: number | null = null;
    let instantPolarPct: number | null = null;

    if (this.table && stwKnots !== null && twsKnots !== null && twaDeg !== null) {
      targetKnots = interpolateTargetSpeed(twaDeg, twsKnots, this.table);
      if (targetKnots > 0) {
        instantPolarPct = (stwKnots / targetKnots) * 100;
      }
    }

    const stale = this.essentials.stale;
    const previous = this.liveSubject.value;
    const lastUpdate = stale ? previous.lastUpdate : Date.now();

    this.liveSubject.next({
      stwKnots,
      boatSpeedSource: this.essentials.speedSource,
      twsKnots,
      twaDeg,
      targetKnots,
      instantPolarPct,
      lastUpdate,
      stale,
    });
  }

  /**
   * True wind arrives as a compass direction. Subtract the heading and fold
   * it to an angle off the bow. Apparent wind is already boat-relative.
   * Polar curves use that absolute angle, so port and starboard share one side.
   */
  private smoothedWind(): { twsKnots: number | null; twaDeg: number | null } {
    if (this.seenTwa && this.seenTws) {
      return {
        twsKnots: this.wind.tws,
        twaDeg: absoluteOffBow(this.wind.twa, this.wind.heading),
      };
    }
    if (this.seenAwa && this.seenAws) {
      return {
        twsKnots: this.wind.aws,
        twaDeg: absoluteOffBow(this.wind.awa, 0),
      };
    }
    return { twsKnots: null, twaDeg: null };
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
    const quiet = !live.lastUpdate || (Date.now() - live.lastUpdate > STALE_AFTER_MS);
    const stale = this.essentials.stale || quiet;
    if (stale !== live.stale) {
      this.liveSubject.next({ ...live, stale });
    }
    this.maybeRecordSample();
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

}

/** Smallest angle between a wind direction and the bow, in 0–180°. */
function absoluteOffBow(directionDeg: number, headingDeg: number): number {
  const relative = ((directionDeg - headingDeg) % 360 + 360) % 360;
  return relative > 180 ? 360 - relative : relative;
}
