import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, OnDestroy, OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PolarAdviceAverages, PolarLiveState, PolarSample } from '../../core/models/polar.model';
import { PolarService } from '../../core/services/polar.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { SailAdvice, formatBand } from '../../core/models/sail-plan.model';
import { SailAdviceStabilizer } from '../../core/services/sail-advice-stabilizer';
import { SailPlanService } from '../../core/services/sail-plan.service';

const WINDOW_MS = 15 * 60 * 1000;
const BUCKET_MS = 10_000;
const BUCKET_COUNT = WINDOW_MS / BUCKET_MS;

export interface PerfBar {
  x: number;
  h: number;
  value: number;
  color: string;
}

@Component({
  selector: 'app-polar',
  templateUrl: './polar.page.html',
  styleUrls: ['./polar.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PolarPage implements OnInit, OnDestroy {

  live: PolarLiveState = {
    stwKnots: null,
    boatSpeedSource: null,
    twsKnots: null,
    twaDeg: null,
    targetKnots: null,
    instantPolarPct: null,
    lastUpdate: null,
    stale: true,
  };

  pct5: number | null = null;
  pct10: number | null = null;
  pct15: number | null = null;
  skConnected = false;
  advice: SailAdvice | null = null;
  planName = '';
  /** 1-min means that drive sail-plan advice (not the live instrument tiles). */
  adviceAvg: PolarAdviceAverages = {
    twaDeg: null,
    twsKnots: null,
    polarPct: null,
    sampleCount: 0,
  };

  /** Original viewBox sizing — CSS uses width:100%; height:auto. */
  readonly chartW = 320;
  readonly chartH = 160;
  readonly padL = 34;
  readonly padR = 10;
  readonly padT = 10;
  readonly padB = 24;
  readonly yMax = 150;
  readonly yTicks = [0, 50, 75, 100, 150];

  bars: PerfBar[] = [];

  private samples: PolarSample[] = [];
  private subs: Subscription[] = [];
  private readonly adviceStabilizer = new SailAdviceStabilizer();

  constructor(
    private readonly polar: PolarService,
    private readonly sk: SignalKService,
    private readonly sailPlans: SailPlanService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.sk.connected$.subscribe(c => {
        this.skConnected = c;
        this.cdr.markForCheck();
      }),
      this.polar.live$.subscribe(live => {
        this.live = live;
        this.refreshAdvice();
        this.cdr.markForCheck();
      }),
      this.polar.adviceAverages$.subscribe(avg => {
        this.adviceAvg = avg;
        this.refreshAdvice();
        this.cdr.markForCheck();
      }),
      this.polar.samples$.subscribe(samples => {
        this.samples = samples;
        this.rebuildChart();
        this.cdr.markForCheck();
      }),
      this.sailPlans.plan$.subscribe(plan => {
        this.planName = plan.name;
        this.adviceStabilizer.reset();
        this.refreshAdvice();
        this.cdr.markForCheck();
      }),
      this.polar.polarPct$(5).subscribe(v => { this.pct5 = v; this.cdr.markForCheck(); }),
      this.polar.polarPct$(10).subscribe(v => { this.pct10 = v; this.cdr.markForCheck(); }),
      this.polar.polarPct$(15).subscribe(v => { this.pct15 = v; this.cdr.markForCheck(); }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get plotW(): number {
    return this.chartW - this.padL - this.padR;
  }

  get plotH(): number {
    return this.chartH - this.padT - this.padB;
  }

  barX(bar: PerfBar): number {
    const slot = this.plotW / BUCKET_COUNT;
    return this.padL + bar.x * this.plotW + slot * 0.1;
  }

  barWidth(): number {
    return (this.plotW / BUCKET_COUNT) * 0.8;
  }

  barY(bar: PerfBar): number {
    return this.padT + this.plotH - Math.min(bar.h, 1) * this.plotH;
  }

  barHeight(bar: PerfBar): number {
    return Math.max(0, Math.min(bar.h, 1) * this.plotH);
  }

  yToSvg(pct: number): number {
    return this.padT + this.plotH - (pct / this.yMax) * this.plotH;
  }

  formatKnots(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(1)} kn`;
  }

  formatDeg(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(0)}°`;
  }

  formatPct(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(0)}%`;
  }

  formatBand = formatBand;

  get boatSpeedLabel(): string {
    switch (this.live.boatSpeedSource) {
      case 'stw':
        return 'STW';
      case 'sog':
        return 'SOG';
      default:
        return 'Speed';
    }
  }

  private refreshAdvice(): void {
    // Prefer 1-min means so cutover text / band choice do not chase gusty live TWS.
    // Fall back to live until the sample buffer has at least one point.
    const twaDeg = this.adviceAvg.twaDeg ?? this.live.twaDeg;
    const twsKnots = this.adviceAvg.twsKnots ?? this.live.twsKnots;
    const polarPct = this.adviceAvg.polarPct ?? this.live.instantPolarPct;
    const raw = this.sailPlans.advise(twaDeg, twsKnots, polarPct);
    this.advice = this.adviceStabilizer.update(
      this.sailPlans.plan,
      raw,
      twaDeg,
      twsKnots,
    );
  }

  /** Absolute wall-clock buckets so completed intervals stay frozen. */
  private rebuildChart(): void {
    const now = Date.now();
    const newestBucket = Math.floor(now / BUCKET_MS);
    const oldestBucket = newestBucket - (BUCKET_COUNT - 1);

    const sums = new Map<number, { sum: number; count: number }>();
    for (const sample of this.samples) {
      const key = Math.floor(sample.timestamp / BUCKET_MS);
      if (key < oldestBucket || key > newestBucket) continue;
      const entry = sums.get(key);
      if (entry) {
        entry.sum += sample.polarPct;
        entry.count += 1;
      } else {
        sums.set(key, { sum: sample.polarPct, count: 1 });
      }
    }

    this.bars = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const entry = sums.get(oldestBucket + i);
      if (!entry) continue;
      const value = entry.sum / entry.count;
      this.bars.push({
        x: i / BUCKET_COUNT,
        h: Math.min(value, this.yMax) / this.yMax,
        value,
        color: this.colorForPct(value),
      });
    }
  }

  private colorForPct(pct: number): string {
    if (pct < 50) return 'var(--polar-perf-low, #c0392b)';
    if (pct < 75) return 'var(--polar-perf-mid, #d4a017)';
    return 'var(--polar-perf-high, #1e9e5a)';
  }
}
