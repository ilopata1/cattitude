/**
 * Live Sail instrument values from Signal-K, resolved through the vessel instrument map.
 * Display values are damped here. Freshness, staleness, and speed-through-water
 * dropout still use the raw samples.
 */
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  EMPTY_SAIL_ESSENTIALS,
  EMPTY_WIND_STEER,
  InstrumentBinding,
  InstrumentMap,
  InstrumentRole,
  SailEssentialsLive,
  WindSteerLive,
} from '../models/instrument-map.model';
import {
  AngleDamper,
  DAMPING_SNAP,
  DAMPING_TAU_S,
  DISPLAY_PUBLISH_MS,
  ScalarDamper,
  VectorDamper,
  sampleTimeMs,
} from './instrument-damping';
import { InstrumentMapService } from './instrument-map.service';
import { SignalKDelta, SignalKService } from './signal-k.service';
import {
  computeTrueWindBaseAngle,
  normalizeAngleDeg,
} from '../../instruments/skip/wind-steer.util';
import { STW_MIN_USEFUL_MPS, isInterspersedStwZero } from './stw-dropout';

const MPS_TO_KNOTS = 1.94384;
const RAD_TO_DEG = 180 / Math.PI;
const STALE_MS = 15_000;
const FRESH_MS = 5_000;
/** Below this damped speed over ground, course is published but marked stale. */
const COG_MIN_SOG_KN = 0.5;
const SPEED_SNAP = {
  fraction: DAMPING_SNAP.speedFraction,
  floor: DAMPING_SNAP.speedFloorKn,
};

type PathKey = string;
type DamperKey = 'heading' | 'cog' | 'stw' | 'sog' | 'depth' | 'apparent' | 'trueWind';

@Injectable({ providedIn: 'root' })
export class InstrumentLiveService implements OnDestroy {

  private readonly windSubject = new BehaviorSubject<WindSteerLive>(EMPTY_WIND_STEER);
  private readonly essentialsSubject = new BehaviorSubject<SailEssentialsLive>(EMPTY_SAIL_ESSENTIALS);

  readonly wind$ = this.windSubject.asObservable();
  readonly essentials$ = this.essentialsSubject.asObservable();

  private subs: Subscription[] = [];
  private pathToRoles = new Map<PathKey, InstrumentRole[]>();
  private rolePaths = new Map<InstrumentRole, string>();
  private speedFallbackPath: PathKey | null = null;
  private twaPath = 'self.environment.wind.angleTrueWater';

  private numericByPath = new Map<PathKey, number>();
  private lastSeenMs = 0;
  private freshUntil = new Map<InstrumentRole, number>();
  private linkUp = false;
  private dampersCleared = false;
  private pending = new Set<DamperKey>();

  private rawHeadingDeg: number | null = null;
  private rawCogDeg: number | null = null;
  private rawAwaDeg: number | null = null;
  private rawAwsKn: number | null = null;
  private rawTwaDeg: number | null = null;
  private rawTwsKn: number | null = null;
  private rawDepthM: number | null = null;

  private wind: WindSteerLive = { ...EMPTY_WIND_STEER };
  private stwMps: number | null = null;
  /** When `stwMps` last came from a useful log reading. */
  private lastGoodStwAt: number | null = null;
  private sogMps: number | null = null;
  private dampedStwKn: number | null = null;
  private dampedSogKn: number | null = null;
  private depthM: number | null = null;

  private readonly headingDamper = new AngleDamper(DAMPING_TAU_S.heading);
  private readonly cogDamper = new AngleDamper(DAMPING_TAU_S.cog);
  private readonly stwDamper = new ScalarDamper(DAMPING_TAU_S.stw, SPEED_SNAP);
  private readonly sogDamper = new ScalarDamper(DAMPING_TAU_S.sog, SPEED_SNAP);
  private readonly depthDamper = new ScalarDamper(DAMPING_TAU_S.depth);
  private readonly apparentDamper = new VectorDamper(DAMPING_TAU_S.apparentWind);
  private readonly trueWindDamper = new VectorDamper(DAMPING_TAU_S.trueWind);

  private publishTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sk: SignalKService,
    private readonly maps: InstrumentMapService,
    private readonly zone: NgZone,
  ) {
    this.subs.push(
      this.maps.map$.subscribe(map => this.rebuildPathIndex(map)),
      this.sk.delta$.subscribe(delta => this.handleDelta(delta)),
      this.sk.connected$.subscribe(connected => {
        this.linkUp = connected;
        if (!connected) {
          this.resetDampers();
          this.dampersCleared = true;
        }
        this.publishHeld();
      }),
    );
    this.zone.runOutsideAngular(() => {
      this.publishTimer = setInterval(() => this.onDisplayTick(), DISPLAY_PUBLISH_MS);
    });
  }

  ngOnDestroy(): void {
    if (this.publishTimer !== null) clearInterval(this.publishTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  private rebuildPathIndex(map: InstrumentMap): void {
    this.pathToRoles.clear();
    this.rolePaths.clear();
    this.speedFallbackPath = null;

    const add = (role: InstrumentRole, binding: InstrumentBinding | undefined) => {
      if (!binding?.path) return;
      this.rolePaths.set(role, binding.path);
      const key = this.skPath(binding.path);
      const roles = this.pathToRoles.get(key) ?? [];
      roles.push(role);
      this.pathToRoles.set(key, roles);
      if (role === 'speed' && binding.fallback?.path) {
        this.speedFallbackPath = this.skPath(binding.fallback.path);
        const fbRoles = this.pathToRoles.get(this.speedFallbackPath) ?? [];
        if (!fbRoles.includes('sog')) fbRoles.push('sog');
        this.pathToRoles.set(this.speedFallbackPath, fbRoles);
      }
      if (role === 'twa') {
        this.twaPath = binding.path;
        this.wind = { ...this.wind, trueWindPath: binding.path };
      }
    };

    const inst = map.instruments;
    add('heading', inst.heading);
    add('cog', inst.cog);
    add('speed', inst.speed);
    add('depth', inst.depth);
    add('awa', inst.awa);
    add('aws', inst.aws);
    add('twa', inst.twa);
    add('tws', inst.tws);
    add('set', inst.set);
    add('drift', inst.drift);
  }

  private handleDelta(delta: SignalKDelta): void {
    const ctx = delta.context ?? '';
    if (ctx.startsWith('vessels.') && this.sk.self && ctx !== this.sk.self) return;

    for (const update of delta.updates ?? []) {
      const arrivedMs = Date.now();
      const tMs = sampleTimeMs(update.timestamp, arrivedMs);
      this.pending.clear();
      for (const kv of update.values ?? []) {
        if (typeof kv.value !== 'number' || !Number.isFinite(kv.value)) continue;
        const key = kv.path.startsWith('self.') ? kv.path.slice(5) : kv.path;
        const roles = this.pathToRoles.get(key);
        if (!roles?.length) continue;

        this.numericByPath.set(key, kv.value);
        this.lastSeenMs = arrivedMs;
        for (const role of roles) {
          this.applyRole(role, key, kv.value, arrivedMs);
        }
      }
      if (this.pending.size) this.flushDampers(tMs);
    }
  }

  private applyRole(role: InstrumentRole, pathKey: PathKey, raw: number, arrivedMs: number): void {
    this.freshUntil.set(role, arrivedMs + FRESH_MS);

    switch (role) {
      case 'heading':
        this.rawHeadingDeg = this.asDegrees(pathKey, raw);
        this.pending.add('heading');
        break;
      case 'cog':
        this.rawCogDeg = this.asDegrees(pathKey, raw);
        this.pending.add('cog');
        break;
      case 'awa':
        this.rawAwaDeg = this.asDegrees(pathKey, raw);
        this.pending.add('apparent');
        break;
      case 'twa':
        this.rawTwaDeg = this.asDegrees(pathKey, raw);
        this.pending.add('trueWind');
        break;
      case 'aws':
        this.rawAwsKn = this.asKnots(pathKey, raw);
        this.pending.add('apparent');
        break;
      case 'tws':
        this.rawTwsKn = this.asKnots(pathKey, raw);
        this.pending.add('trueWind');
        break;
      case 'speed':
        if (isInterspersedStwZero(raw, {
          previousMps: this.stwMps ?? undefined,
          previousAtMs: this.lastGoodStwAt,
          sogMps: this.sogMps ?? undefined,
        }, arrivedMs)) {
          break;
        }
        this.stwMps = raw;
        if (Math.abs(raw) >= STW_MIN_USEFUL_MPS) {
          this.lastGoodStwAt = arrivedMs;
        }
        this.pending.add('stw');
        break;
      case 'sog':
        this.sogMps = raw;
        this.pending.add('sog');
        break;
      case 'depth':
        this.rawDepthM = raw;
        this.pending.add('depth');
        break;
      default:
        break;
    }
  }

  /**
   * One push per damper per update. A Signal K update carries one timestamp
   * for every path in the batch, and a second push at that same time would
   * look like a clock rewind and re-seed the filter.
   */
  private flushDampers(tMs: number): void {
    if (this.pending.has('heading') && this.rawHeadingDeg !== null) {
      this.wind = { ...this.wind, heading: this.headingDamper.push(this.rawHeadingDeg, tMs) };
    }
    if (this.pending.has('cog') && this.rawCogDeg !== null) {
      this.wind = { ...this.wind, cog: this.cogDamper.push(this.rawCogDeg, tMs) };
    }
    if (this.pending.has('stw') && this.stwMps !== null) {
      this.dampedStwKn = this.stwDamper.push(this.stwMps * MPS_TO_KNOTS, tMs);
    }
    if (this.pending.has('sog') && this.sogMps !== null) {
      this.dampedSogKn = this.sogDamper.push(this.sogMps * MPS_TO_KNOTS, tMs);
    }
    if (this.pending.has('depth') && this.rawDepthM !== null) {
      this.depthM = this.depthDamper.push(this.rawDepthM, tMs);
    }
    if (this.pending.has('apparent')) this.pushApparent(tMs);
    if (this.pending.has('heading') || this.pending.has('trueWind')) this.pushTrueWind(tMs);
    this.pending.clear();
  }

  private pushApparent(tMs: number): void {
    if (this.rawAwaDeg === null || this.rawAwsKn === null) return;
    const next = this.apparentDamper.push(this.rawAwaDeg, this.rawAwsKn, tMs);
    this.wind = { ...this.wind, awa: next.angleDeg, aws: next.speed };
  }

  private pushTrueWind(tMs: number): void {
    if (this.rawTwaDeg === null || this.rawTwsKn === null) return;
    const heading = this.rawHeadingDeg ?? 0;
    const twd = normalizeAngleDeg(
      computeTrueWindBaseAngle(this.twaPath, this.rawTwaDeg, heading, true),
    );
    const next = this.trueWindDamper.push(twd, this.rawTwsKn, tMs);
    this.wind = { ...this.wind, twa: next.angleDeg, tws: next.speed };
  }

  private onDisplayTick(): void {
    const now = Date.now();
    const stale = !this.linkUp || !this.lastSeenMs || (now - this.lastSeenMs > STALE_MS);
    if (stale) {
      if (!this.dampersCleared) {
        this.resetDampers();
        this.dampersCleared = true;
      }
    } else {
      this.dampersCleared = false;
    }
    this.publishHeld();
  }

  private publishHeld(): void {
    const wind = this.windSnapshot(Date.now());
    const essentials = this.essentialsSnapshot();
    const windChanged = !this.sameWind(this.windSubject.value, wind);
    const essentialsChanged = !this.sameEssentials(this.essentialsSubject.value, essentials);
    if (!windChanged && !essentialsChanged) return;
    this.zone.run(() => {
      if (windChanged) this.windSubject.next(wind);
      if (essentialsChanged) this.essentialsSubject.next(essentials);
    });
  }

  private windSnapshot(now: number): WindSteerLive {
    const fresh = (role: InstrumentRole) => (this.freshUntil.get(role) ?? 0) > now;
    const sogKn = this.dampedSogKn;
    const cogSlow = sogKn !== null && sogKn < COG_MIN_SOG_KN;
    return {
      ...this.wind,
      headingFresh: fresh('heading'),
      cogFresh: fresh('cog') && !cogSlow,
      awaFresh: fresh('awa'),
      awsFresh: fresh('aws'),
      twaFresh: fresh('twa'),
      twsFresh: fresh('tws'),
    };
  }

  private essentialsSnapshot(): SailEssentialsLive {
    const speed = this.resolveSpeed();
    const now = Date.now();
    const quiet = !this.lastSeenMs || (now - this.lastSeenMs > STALE_MS);
    return {
      depthM: this.depthM,
      speedKn: speed.knots,
      speedSource: speed.source,
      sogKnots: this.dampedSogKn,
      stale: !this.linkUp || quiet,
    };
  }

  private resolveSpeed(): { knots: number | null; source: 'stw' | 'sog' | null } {
    if (this.stwMps !== null && Math.abs(this.stwMps) >= STW_MIN_USEFUL_MPS) {
      return { knots: this.dampedStwKn, source: 'stw' };
    }
    if (this.sogMps !== null) {
      return { knots: this.dampedSogKn, source: 'sog' };
    }
    if (this.stwMps !== null) {
      return { knots: this.dampedStwKn, source: 'stw' };
    }
    return { knots: null, source: null };
  }

  private resetDampers(): void {
    this.headingDamper.reset();
    this.cogDamper.reset();
    this.stwDamper.reset();
    this.sogDamper.reset();
    this.depthDamper.reset();
    this.apparentDamper.reset();
    this.trueWindDamper.reset();
  }

  private sameWind(a: WindSteerLive, b: WindSteerLive): boolean {
    return a.heading === b.heading
      && a.cog === b.cog
      && a.awa === b.awa
      && a.aws === b.aws
      && a.twa === b.twa
      && a.tws === b.tws
      && a.trueWindPath === b.trueWindPath
      && a.headingFresh === b.headingFresh
      && a.cogFresh === b.cogFresh
      && a.awaFresh === b.awaFresh
      && a.awsFresh === b.awsFresh
      && a.twaFresh === b.twaFresh
      && a.twsFresh === b.twsFresh;
  }

  private sameEssentials(a: SailEssentialsLive, b: SailEssentialsLive): boolean {
    return a.depthM === b.depthM
      && a.speedKn === b.speedKn
      && a.speedSource === b.speedSource
      && a.sogKnots === b.sogKnots
      && a.stale === b.stale;
  }

  private skPath(full: string): PathKey {
    return full.startsWith('self.') ? full.slice(5) : full;
  }

  private asDegrees(pathKey: PathKey, value: number): number {
    if (this.looksLikeRadians(value)) {
      return normalizeAngleDeg(value * RAD_TO_DEG);
    }
    return normalizeAngleDeg(value);
  }

  private asKnots(_pathKey: PathKey, value: number): number {
    return value * MPS_TO_KNOTS;
  }

  private looksLikeRadians(value: number): boolean {
    return Math.abs(value) <= 6.5;
  }
}
