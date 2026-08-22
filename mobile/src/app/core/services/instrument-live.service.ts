/**
 * Live Sail instrument values from Signal-K, resolved through the vessel instrument map.
 */
import { Injectable, OnDestroy } from '@angular/core';
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
import { InstrumentMapService } from './instrument-map.service';
import { SignalKDelta, SignalKService } from './signal-k.service';
import {
  angleDeltaDeg,
  computeTrueWindBaseAngle,
  normalizeAngleDeg,
} from '../../instruments/skip/wind-steer.util';

const MPS_TO_KNOTS = 1.94384;
const RAD_TO_DEG = 180 / Math.PI;
const STALE_MS = 15_000;
const FRESH_MS = 5_000;
const STW_MIN_USEFUL_MPS = 0.05;
const DEG_EPSILON = 1;

type PathKey = string;

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
  private rawTwa: number | null = null;

  private wind: WindSteerLive = { ...EMPTY_WIND_STEER };
  private stwMps: number | null = null;
  private sogMps: number | null = null;
  private depthM: number | null = null;

  constructor(
    private readonly sk: SignalKService,
    private readonly maps: InstrumentMapService,
  ) {
    this.subs.push(
      this.maps.map$.subscribe(map => this.rebuildPathIndex(map)),
      this.sk.delta$.subscribe(delta => this.handleDelta(delta)),
    );
    this.subs.push(
      this.sk.connected$.subscribe(connected => {
        if (!connected) {
          this.publishEssentials(true);
        }
      }),
    );
  }

  ngOnDestroy(): void {
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

    let touched = false;
    for (const update of delta.updates ?? []) {
      for (const kv of update.values ?? []) {
        if (typeof kv.value !== 'number' || !Number.isFinite(kv.value)) continue;
        const key = kv.path.startsWith('self.') ? kv.path.slice(5) : kv.path;
        const roles = this.pathToRoles.get(key);
        if (!roles?.length) continue;

        this.numericByPath.set(key, kv.value);
        this.lastSeenMs = Date.now();
        for (const role of roles) {
          this.applyRole(role, key, kv.value);
        }
        touched = true;
      }
    }
    if (touched) {
      this.publishWind();
      this.publishEssentials(false);
    }
  }

  private applyRole(role: InstrumentRole, pathKey: PathKey, raw: number): void {
    const now = Date.now();
    this.freshUntil.set(role, now + FRESH_MS);

    switch (role) {
      case 'heading': {
        const next = this.asDegrees(pathKey, raw);
        if (angleDeltaDeg(this.wind.heading, next) >= DEG_EPSILON) {
          this.wind = { ...this.wind, heading: next };
          this.recomputeTwa();
        }
        break;
      }
      case 'cog': {
        const next = this.asDegrees(pathKey, raw);
        if (angleDeltaDeg(this.wind.cog, next) >= DEG_EPSILON) {
          this.wind = { ...this.wind, cog: next };
        }
        break;
      }
      case 'awa': {
        const next = this.asDegrees(pathKey, raw);
        if (angleDeltaDeg(this.wind.awa, next) >= DEG_EPSILON) {
          this.wind = { ...this.wind, awa: next };
        }
        break;
      }
      case 'twa': {
        this.rawTwa = this.asDegrees(pathKey, raw);
        this.recomputeTwa();
        break;
      }
      case 'aws':
        this.wind = { ...this.wind, aws: this.asKnots(pathKey, raw) };
        break;
      case 'tws':
        this.wind = { ...this.wind, tws: this.asKnots(pathKey, raw) };
        break;
      case 'speed':
        this.stwMps = raw;
        break;
      case 'sog':
        this.sogMps = raw;
        break;
      case 'depth':
        this.depthM = raw;
        break;
      default:
        break;
    }
  }

  private recomputeTwa(): void {
    if (this.rawTwa == null) return;
    const next = normalizeAngleDeg(
      computeTrueWindBaseAngle(this.twaPath, this.rawTwa, this.wind.heading, true),
    );
    if (angleDeltaDeg(this.wind.twa, next) >= DEG_EPSILON) {
      this.wind = { ...this.wind, twa: next };
    }
  }

  private publishWind(): void {
    const now = Date.now();
    this.windSubject.next({
      ...this.wind,
      headingFresh: (this.freshUntil.get('heading') ?? 0) > now,
      cogFresh: (this.freshUntil.get('cog') ?? 0) > now,
      awaFresh: (this.freshUntil.get('awa') ?? 0) > now,
      awsFresh: (this.freshUntil.get('aws') ?? 0) > now,
      twaFresh: (this.freshUntil.get('twa') ?? 0) > now,
      twsFresh: (this.freshUntil.get('tws') ?? 0) > now,
    });
  }

  private publishEssentials(stale: boolean): void {
    const speed = this.resolveSpeed();
    const isStale = stale || !this.lastSeenMs || (Date.now() - this.lastSeenMs > STALE_MS);
    this.essentialsSubject.next({
      depthM: this.depthM,
      speedKn: speed.knots,
      speedSource: speed.source,
      stale: isStale,
    });
  }

  private resolveSpeed(): { knots: number | null; source: 'stw' | 'sog' | null } {
    if (this.stwMps !== null && Math.abs(this.stwMps) >= STW_MIN_USEFUL_MPS) {
      return { knots: this.stwMps * MPS_TO_KNOTS, source: 'stw' };
    }
    if (this.sogMps !== null) {
      return { knots: this.sogMps * MPS_TO_KNOTS, source: 'sog' };
    }
    if (this.stwMps !== null) {
      return { knots: this.stwMps * MPS_TO_KNOTS, source: 'stw' };
    }
    return { knots: null, source: null };
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
