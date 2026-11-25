/**
 * Records an A/B sail test from the live Signal K stream.
 * The clock keeps running if the crew leaves the page.
 */
import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  AB_SAMPLE_MS,
  AbSample,
  AbSession,
  AbSetup,
  ImuPoint,
  absoluteOffBow,
  armLeg,
  combinedRudderDeg,
  foldSignedDeg,
  clearTest,
  emptySession,
  noteAlarm,
  partMs,
  requestRerun,
  revealResults,
  startTest,
  tick,
} from '../ab-test/ab-test';
import { InstrumentMap } from '../models/instrument-map.model';
import { computeTrueWindBaseAngle, normalizeAngleDeg } from '../../instruments/skip/wind-steer.util';
import { STW_MIN_USEFUL_MPS, isInterspersedStwZero } from './stw-dropout';
import { InstrumentMapService } from './instrument-map.service';
import { PolarService } from './polar.service';
import { SignalKDelta, SignalKService } from './signal-k.service';

const FRESH_MS = 2_500;
const MPS_TO_KNOTS = 1.94384;
const RAD_TO_DEG = 180 / Math.PI;
const ACCEL_KEYS = new Set([
  'navigation.imu.accelZ',
  'navigation.attitude.accelZ',
  'sensors.imu.accel.z',
  'sensors.imu.acceleration.z',
]);

interface Timed {
  value: number;
  at: number;
}

interface Paths {
  tws: string;
  twa: string;
  heading: string;
  cog: string;
  stw: string;
  sog: string;
}

@Injectable({ providedIn: 'root' })
export class AbTestService implements OnDestroy {

  private readonly sessionSubject = new BehaviorSubject<AbSession>(emptySession());
  readonly session$ = this.sessionSubject.asObservable();

  private readonly subs: Subscription[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly fresh = new Map<string, Timed>();
  private paths: Paths = {
    tws: 'environment.wind.speedTrue',
    twa: 'environment.wind.angleTrueWater',
    heading: 'navigation.headingTrue',
    cog: 'navigation.courseOverGroundTrue',
    stw: 'navigation.speedThroughWater',
    sog: 'navigation.speedOverGround',
  };
  private twaPath = 'self.environment.wind.angleTrueWater';
  private pitch: Timed | null = null;
  private roll: Timed | null = null;
  private heave: Timed | null = null;
  private accel: Timed | null = null;
  private lastGoodStw: number | null = null;
  private lastGoodStwAt: number | null = null;
  private readonly alarmState = new Map<string, string>();
  private readonly alarmText = new Map<string, string>();

  private readonly sk = inject(SignalKService);
  private readonly maps = inject(InstrumentMapService);
  private readonly polar = inject(PolarService);

  constructor() {
    this.applyMap(this.maps.map);
    this.subs.push(
      this.maps.map$.subscribe((map) => this.applyMap(map)),
      this.sk.delta$.subscribe((delta) => this.onDelta(delta)),
    );
  }

  ngOnDestroy(): void {
    this.stopClock();
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  get session(): AbSession {
    return this.sessionSubject.value;
  }

  remember(setup: AbSetup): void {
    if (this.session.phase !== 'setup') return;
    this.sessionSubject.next({ ...this.session, setup: { ...setup } });
  }

  start(setup: AbSetup): void {
    const next = startTest(this.session, setup, Date.now());
    if (next === this.session) return;
    this.sessionSubject.next(next);
    this.beginClock();
  }

  confirmReady(): void {
    const next = armLeg(this.session, Date.now());
    if (next === this.session) return;
    this.sessionSubject.next(next);
    this.beginClock();
  }

  rerun(): void {
    this.stopClock();
    this.sessionSubject.next(requestRerun(this.session));
  }

  /** Marks the test complete after any cycle and opens the final result. */
  showResults(): void {
    this.stopClock();
    this.sessionSubject.next(revealResults(this.session));
  }

  abandon(): void {
    this.stopClock();
    this.sessionSubject.next(clearTest(this.session));
  }

  private beginClock(): void {
    this.stopClock();
    this.latchAlarms();
    this.onTick();
    this.timer = setInterval(() => this.onTick(), AB_SAMPLE_MS);
  }

  private stopClock(): void {
    if (this.timer != null) clearInterval(this.timer);
    this.timer = null;
  }

  private onTick(): void {
    const current = this.session;
    if (current.phase !== 'recording' || current.startedAt == null) {
      this.stopClock();
      return;
    }
    const now = Date.now();
    const offset = now - current.startedAt;
    const sample = offset >= partMs(current.setup) ? null : this.capture(offset, now);
    const next = tick(current, now, sample);
    this.sessionSubject.next(next);
    if (next.phase !== 'recording') this.stopClock();
  }

  private capture(tOffsetMs: number, now: number): AbSample {
    const tws = this.knots(this.paths.tws, now);
    const heading = this.degrees(this.paths.heading, now);
    const angle = this.degrees(this.paths.twa, now);
    const boatRelative = this.twaPath.includes('angleTrueWater') || this.twaPath.includes('angleTrueGround');
    let twd: number | null = null;
    let twa: number | null = null;
    let signedTwa: number | null = null;
    if (angle != null) {
      const base = normalizeAngleDeg(computeTrueWindBaseAngle(this.twaPath, angle, heading ?? 0, true));
      if (boatRelative) {
        twa = absoluteOffBow(base, heading ?? 0);
        twd = heading == null ? null : base;
        const relative = this.rawDegrees(this.paths.twa, now);
        signedTwa = relative == null ? null : foldSignedDeg(relative);
      } else {
        twd = base;
        twa = heading == null ? null : absoluteOffBow(base, heading);
      }
    }
    if (signedTwa == null && heading != null && twd != null) {
      signedTwa = foldSignedDeg(twd - heading);
    }
    const stw = this.stwKnots(now);
    const sog = this.knots(this.paths.sog, now);
    const cog = this.degrees(this.paths.cog, now);
    const pitch = this.slot(this.pitch, now);
    const roll = this.slot(this.roll, now);
    const heave = this.slot(this.heave, now);
    const vertAccel = this.slot(this.accel, now);
    const rudderDeg = combinedRudderDeg(
      this.read('steering.rudderAngle', now),
      this.read('steering.rudderAngle.port', now),
      this.read('steering.rudderAngle.starboard', now),
    );
    const targetKn = twa != null && tws != null ? this.polar.targetKnots(twa, tws) : null;
    const vmgSpeedKn = stw ?? sog;
    const vmgSpeedSource = stw != null ? 'stw' : sog != null ? 'sog' : null;
    return {
      tOffsetMs,
      twsKn: tws,
      twdDeg: twd,
      stwKn: stw,
      sogKn: sog,
      headingDeg: heading,
      cogDeg: cog,
      twaDeg: twa,
      signedTwaDeg: signedTwa,
      rudderDeg,
      targetKn,
      vmgSpeedKn,
      vmgSpeedSource,
      pitchRad: pitch,
      rollRad: roll,
      heaveM: heave,
      vertAccel,
      windMissing: tws == null || twd == null,
      speedMissing: stw == null && sog == null,
      attitudeMissing: pitch == null && roll == null,
    };
  }

  private onDelta(delta: SignalKDelta): void {
    const context = delta.context ?? '';
    if (context.startsWith('vessels.') && this.sk.self && context !== this.sk.self) return;
    const now = Date.now();
    for (const update of delta.updates ?? []) {
      for (const entry of update.values ?? []) this.ingest(entry.path, entry.value, now);
    }
  }

  private ingest(path: string, value: unknown, now: number): void {
    const key = path.startsWith('self.') ? path.slice(5) : path;
    if (key.startsWith('notifications.') && /autopilot|pilot/i.test(key)) {
      this.ingestAlarm(key, value);
      return;
    }
    if (value == null) {
      this.fresh.delete(key);
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      this.fresh.set(key, { value, at: now });
      this.noteImuNumber(key, value, now);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (key === 'navigation.attitude' || key.endsWith('.attitude')) this.noteAttitude(record, now);
    if (typeof record['z'] === 'number' && Number.isFinite(record['z']) && /accel/i.test(key)) {
      this.accel = { value: record['z'], at: now };
      this.pushImu({ vertAccel: record['z'] }, now);
    }
  }

  private noteImuNumber(key: string, value: number, now: number): void {
    if (key.endsWith('attitude.pitch')) {
      this.pitch = { value, at: now };
      this.pushImu({ pitchRad: value }, now);
      return;
    }
    if (key.endsWith('attitude.roll')) {
      this.roll = { value, at: now };
      this.pushImu({ rollRad: value }, now);
      return;
    }
    if (key === 'navigation.heave' || key.endsWith('.heave')) {
      this.heave = { value, at: now };
      this.pushImu({ heaveM: value }, now);
      return;
    }
    if (ACCEL_KEYS.has(key)) {
      this.accel = { value, at: now };
      this.pushImu({ vertAccel: value }, now);
    }
  }

  private noteAttitude(record: Record<string, unknown>, now: number): void {
    const point: Omit<ImuPoint, 'tOffsetMs'> = {};
    if (typeof record['pitch'] === 'number' && Number.isFinite(record['pitch'])) {
      this.pitch = { value: record['pitch'], at: now };
      point.pitchRad = record['pitch'];
    }
    if (typeof record['roll'] === 'number' && Number.isFinite(record['roll'])) {
      this.roll = { value: record['roll'], at: now };
      point.rollRad = record['roll'];
    }
    if (point.pitchRad != null || point.rollRad != null) this.pushImu(point, now);
  }

  private pushImu(partial: Omit<ImuPoint, 'tOffsetMs'>, now: number): void {
    const session = this.session;
    if (session.phase !== 'recording' || session.startedAt == null) return;
    const tOffsetMs = now - session.startedAt;
    if (tOffsetMs < 0 || tOffsetMs >= partMs(session.setup)) return;
    const buffer = session.imuLive;
    if (buffer.length >= 80_000) {
      const kept = buffer.filter((_, index) => index % 2 === 0);
      buffer.length = 0;
      buffer.push(...kept);
    }
    buffer.push({ tOffsetMs, ...partial });
  }

  private ingestAlarm(path: string, value: unknown): void {
    if (!value || typeof value !== 'object') return;
    const record = value as { state?: unknown; message?: unknown };
    const state = typeof record.state === 'string' ? record.state : '';
    const message = typeof record.message === 'string' && record.message.trim()
      ? record.message.trim()
      : 'Autopilot alarm';
    const previous = this.alarmState.get(path);
    this.alarmState.set(path, state);
    this.alarmText.set(path, message);
    if (this.session.phase !== 'recording') return;
    if (hot(state) && !hot(previous)) this.sessionSubject.next(noteAlarm(this.session, message));
  }

  private latchAlarms(): void {
    let session = this.session;
    for (const [path, state] of this.alarmState) {
      if (!hot(state)) continue;
      session = noteAlarm(session, this.alarmText.get(path) || 'Autopilot alarm');
    }
    if (session !== this.session) this.sessionSubject.next(session);
  }

  private applyMap(map: InstrumentMap): void {
    const instruments = map.instruments;
    this.paths = {
      tws: strip(instruments.tws?.path) || 'environment.wind.speedTrue',
      twa: strip(instruments.twa?.path) || 'environment.wind.angleTrueWater',
      heading: strip(instruments.heading?.path) || 'navigation.headingTrue',
      cog: strip(instruments.cog?.path) || 'navigation.courseOverGroundTrue',
      stw: strip(instruments.speed?.path) || 'navigation.speedThroughWater',
      sog: strip(instruments.speed?.fallback?.path) || 'navigation.speedOverGround',
    };
    this.twaPath = instruments.twa?.path || 'self.environment.wind.angleTrueWater';
  }

  private stwKnots(now: number): number | null {
    const raw = this.read(this.paths.stw, now);
    if (raw == null) return null;
    const sog = this.read(this.paths.sog, now);
    if (isInterspersedStwZero(raw, {
      previousMps: this.lastGoodStw ?? undefined,
      previousAtMs: this.lastGoodStwAt,
      sogMps: sog ?? undefined,
    }, now)) {
      return this.lastGoodStw == null ? null : this.lastGoodStw * MPS_TO_KNOTS;
    }
    this.lastGoodStw = raw;
    if (Math.abs(raw) >= STW_MIN_USEFUL_MPS) this.lastGoodStwAt = now;
    return raw * MPS_TO_KNOTS;
  }

  private knots(path: string, now: number): number | null {
    const value = this.read(path, now);
    return value == null ? null : value * MPS_TO_KNOTS;
  }

  private degrees(path: string, now: number): number | null {
    const value = this.rawDegrees(path, now);
    return value == null ? null : normalizeAngleDeg(value);
  }

  private rawDegrees(path: string, now: number): number | null {
    const value = this.read(path, now);
    return value == null ? null : value * RAD_TO_DEG;
  }

  private read(path: string, now: number): number | null {
    const hit = this.fresh.get(path);
    if (!hit || now - hit.at > FRESH_MS) return null;
    return hit.value;
  }

  private slot(timed: Timed | null, now: number): number | null {
    if (!timed || now - timed.at > FRESH_MS) return null;
    return timed.value;
  }
}

function strip(path: string | undefined): string {
  if (!path) return '';
  return path.startsWith('self.') ? path.slice(5) : path;
}

function hot(state: string | undefined): boolean {
  return state === 'alarm' || state === 'emergency' || state === 'alert' || state === 'warn';
}
