import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  CoursePrior,
  WaveEstimate,
  WaveSeries,
  WaveTrace,
  afterLastLongGap,
  analyzeWindow,
} from '../waves/wave-estimator';
import { AttitudeBucket, attitudeParts, attitudeSourceId, fasterAttitude } from '../waves/wave-attitude';
import { resolveWaveConfig } from '../waves/wave-settings';
import { ContentService } from './content.service';
import { sampleTimeMs } from './instrument-damping';
import { STW_MIN_USEFUL_MPS, isInterspersedStwZero } from './stw-dropout';
import { SignalKDelta, SignalKService } from './signal-k.service';
import { WaveSettingsService } from './wave-settings.service';

export interface WaveMonitorState {
  collectedS: number;
  windowS: number;
  estimate: WaveEstimate | null;
  connected: boolean;
}

const SOG_PATH = 'navigation.speedOverGround';
const STW_PATH = 'navigation.speedThroughWater';

const TRACKED = new Set([
  'navigation.gnss.antennaAltitude',
  'navigation.rateOfTurn',
  'steering.rudderAngle',
  'navigation.speedThroughWater',
  'navigation.headingTrue',
  'navigation.headingMagnetic',
  'navigation.magneticVariation',
  'environment.wind.directionTrue',
]);

@Injectable({ providedIn: 'root' })
export class WaveEstimatorService implements OnDestroy {
  private readonly sk = inject(SignalKService);
  private readonly settings = inject(WaveSettingsService);
  private readonly content = inject(ContentService);

  private readonly stateSubject = new BehaviorSubject<WaveMonitorState>({
    collectedS: 0,
    windowS: 1200,
    estimate: null,
    connected: false,
  });
  readonly state$ = this.stateSubject.asObservable();

  private readonly traces = new Map<string, WaveTrace>();
  /** Pitch and roll kept apart per Signal K source, so a slow sensor cannot mix into a fast one. */
  private readonly attitude = new Map<string, AttitudeBucket>();
  private readonly sub = new Subscription();
  private lastCollectedPatch = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRun = 0;
  private running = false;
  private prior: CoursePrior | null = null;
  private sogMps: number | null = null;
  private lastGoodStw: number | null = null;
  private lastGoodStwAt: number | null = null;

  constructor() {
    this.sub.add(this.sk.delta$.subscribe((delta) => this.onDelta(delta)));
    this.sub.add(this.sk.state$.subscribe((state) => {
      this.patch({ connected: state === 'connected' });
    }));
    this.sub.add(this.settings.settings$.subscribe(() => {
      this.lastRun = 0;
    }));
    this.timer = setInterval(() => this.tick(), 10_000);
  }

  get current(): WaveMonitorState {
    return this.stateSubject.value;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.timer) clearInterval(this.timer);
  }

  private tick(): void {
    const config = resolveWaveConfig(this.settings.current, this.vesselType());
    const collectedS = this.collectedSeconds();
    this.patch({ collectedS, windowS: config.windowS });
    if (collectedS < config.welchSegS) return;
    if (this.lastRun && Date.now() - this.lastRun < config.stepS * 1000) return;
    if (this.running) return;
    this.running = true;
    this.lastRun = Date.now();
    setTimeout(() => {
      try {
        this.analyze(collectedS, config.windowS);
      } finally {
        this.running = false;
      }
    }, 0);
  }

  private analyze(collectedS: number, windowS: number): void {
    const series = this.series();
    if (!series) return;
    const config = resolveWaveConfig(this.settings.current, this.vesselType());
    const steady = this.afterLastCourseChange(series);
    const estimate = analyzeWindow(steady, config, this.prior);
    if (
      estimate.status === 'ok' &&
      !estimate.ambiguous &&
      estimate.tpEncounter != null &&
      estimate.headingRad != null &&
      estimate.stw != null
    ) {
      this.prior = {
        headingRad: estimate.headingRad,
        stw: estimate.stw,
        tpEncounter: estimate.tpEncounter,
        time: estimate.time,
      };
    }
    this.patch({ estimate, collectedS, windowS });
  }

  private onDelta(delta: SignalKDelta): void {
    const context = delta.context ?? '';
    if (context.startsWith('vessels.') && this.sk.self && context !== this.sk.self) return;
    const keepFrom = Date.now() / 1000 - 1260;
    let sawAttitude = false;
    for (const update of delta.updates ?? []) {
      const t = sampleTimeMs(update.timestamp, Date.now()) / 1000;
      const source = attitudeSourceId(update);
      for (const kv of update.values ?? []) {
        const path = kv.path.startsWith('self.') ? kv.path.slice(5) : kv.path;
        if (path === 'navigation.attitude') {
          const parts = attitudeParts(kv.value);
          if (!parts) continue;
          this.noteAttitude(source, t, parts.pitch, parts.roll, keepFrom);
          sawAttitude = true;
          continue;
        }
        if (typeof kv.value !== 'number' || !Number.isFinite(kv.value)) continue;
        if (path === 'navigation.attitude.pitch') {
          this.noteAttitude(source, t, kv.value, null, keepFrom);
          sawAttitude = true;
          continue;
        }
        if (path === 'navigation.attitude.roll') {
          this.noteAttitude(source, t, null, kv.value, keepFrom);
          sawAttitude = true;
          continue;
        }
        if (path === SOG_PATH) {
          this.sogMps = kv.value;
          continue;
        }
        if (path === STW_PATH && this.isStwDropout(kv.value, t * 1000)) continue;
        if (!TRACKED.has(path)) continue;
        this.push(path, t, kv.value, keepFrom);
      }
    }
    if (sawAttitude) this.publishCollected();
  }

  /**
   * The log on some boats sends an odd zero while the boat is moving. Kept, those zeros
   * make the speed look unsteady and the whole window is rejected. Same rule as the A/B test.
   */
  private isStwDropout(mps: number, atMs: number): boolean {
    if (isInterspersedStwZero(mps, {
      previousMps: this.lastGoodStw ?? undefined,
      previousAtMs: this.lastGoodStwAt,
      sogMps: this.sogMps ?? undefined,
    }, atMs)) {
      return true;
    }
    this.lastGoodStw = mps;
    if (Math.abs(mps) >= STW_MIN_USEFUL_MPS) this.lastGoodStwAt = atMs;
    return false;
  }

  private noteAttitude(
    source: string,
    t: number,
    pitch: number | null,
    roll: number | null,
    keepFrom: number,
  ): void {
    let bucket = this.attitude.get(source);
    if (!bucket) {
      bucket = { pitch: { t: [], v: [] }, roll: { t: [], v: [] } };
      this.attitude.set(source, bucket);
    }
    if (pitch != null) this.pushTrace(bucket.pitch, t, pitch, keepFrom);
    if (roll != null) this.pushTrace(bucket.roll, t, roll, keepFrom);
  }

  private publishCollected(): void {
    const now = Date.now();
    if (now - this.lastCollectedPatch < 1000) return;
    this.lastCollectedPatch = now;
    const config = resolveWaveConfig(this.settings.current, this.vesselType());
    this.patch({ collectedS: this.collectedSeconds(), windowS: config.windowS });
  }

  private push(path: string, t: number, value: number, keepFrom: number): void {
    let trace = this.traces.get(path);
    if (!trace) {
      trace = { t: [], v: [] };
      this.traces.set(path, trace);
    }
    this.pushTrace(trace, t, value, keepFrom);
  }

  private pushTrace(trace: WaveTrace, t: number, value: number, keepFrom: number): void {
    const n = trace.t.length;
    if (n > 0 && t < trace.t[n - 1] - 1) return;
    if (n > 0 && t === trace.t[n - 1]) {
      trace.v[n - 1] = value;
    } else {
      trace.t.push(t);
      trace.v.push(value);
    }
    if (trace.t.length > 2000 && trace.t[0] < keepFrom) {
      const cut = trace.t.findIndex((time) => time >= keepFrom);
      if (cut > 0) {
        trace.t.splice(0, cut);
        trace.v.splice(0, cut);
      }
    }
  }

  private series(): WaveSeries | null {
    const motion = this.motion();
    if (!motion) return null;
    return afterLastLongGap({
      pitch: motion.pitch,
      roll: motion.roll,
      antennaAltitude: this.traces.get('navigation.gnss.antennaAltitude'),
      rateOfTurn: this.traces.get('navigation.rateOfTurn'),
      rudderAngle: this.traces.get('steering.rudderAngle'),
      stw: this.traces.get('navigation.speedThroughWater'),
      heading: this.headingTrace(),
      windFrom: this.traces.get('environment.wind.directionTrue'),
    });
  }

  private headingTrace(): WaveTrace | undefined {
    const truth = this.traces.get('navigation.headingTrue');
    if (truth && truth.t.length > 1) return truth;
    const magnetic = this.traces.get('navigation.headingMagnetic');
    if (!magnetic) return undefined;
    const variation = this.traces.get('navigation.magneticVariation');
    const offset = variation && variation.v.length ? variation.v[variation.v.length - 1] : 0;
    if (!offset) return magnetic;
    return { t: magnetic.t.slice(), v: magnetic.v.map((value) => value + offset) };
  }

  /** A tack inside the buffer would reject the whole window. Keep the steady leg after it. */
  private afterLastCourseChange(series: WaveSeries): WaveSeries {
    const heading = series.heading;
    if (!heading || heading.v.length < 4) return series;
    let previous = heading.v[0];
    let cut = 0;
    for (let i = 1; i < heading.v.length; i++) {
      let delta = heading.v[i] - previous;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      previous = heading.v[i];
      if (Math.abs(delta) > (30 * Math.PI) / 180) cut = i;
    }
    if (cut === 0) return series;
    const t0 = heading.t[cut];
    const trim = (trace?: WaveTrace): WaveTrace | undefined => {
      if (!trace) return undefined;
      const index = trace.t.findIndex((time) => time >= t0);
      if (index <= 0) return trace;
      return { t: trace.t.slice(index), v: trace.v.slice(index) };
    };
    return {
      pitch: trim(series.pitch) ?? series.pitch,
      roll: trim(series.roll) ?? series.roll,
      antennaAltitude: trim(series.antennaAltitude),
      rateOfTurn: trim(series.rateOfTurn),
      rudderAngle: trim(series.rudderAngle),
      stw: trim(series.stw),
      heading: trim(series.heading),
      windFrom: trim(series.windFrom),
    };
  }

  /** Seconds of unbroken pitch and roll, counted from the last long gap. */
  private collectedSeconds(): number {
    const whole = this.motion();
    if (!whole) return 0;
    const motion = afterLastLongGap({ pitch: whole.pitch, roll: whole.roll });
    if (!motion.pitch.t.length || !motion.roll.t.length) return 0;
    const start = Math.max(motion.pitch.t[0], motion.roll.t[0]);
    const end = Math.min(motion.pitch.t[motion.pitch.t.length - 1], motion.roll.t[motion.roll.t.length - 1]);
    return Math.max(0, end - start);
  }

  /** One attitude stream. Two devices on the same path would otherwise be interleaved. */
  private motion(): AttitudeBucket | null {
    return fasterAttitude(this.attitude.values());
  }

  private vesselType(): string | null {
    try {
      return this.content.bootstrap.branding.vesselType;
    } catch {
      return null;
    }
  }

  private patch(partial: Partial<WaveMonitorState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }
}
