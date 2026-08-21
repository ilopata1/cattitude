import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, OnDestroy, OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PolarLiveState, PolarSample } from '../../core/models/polar.model';
import { PolarService } from '../../core/services/polar.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { SailAdvice, formatBand } from '../../core/models/sail-plan.model';
import { SailPlanService } from '../../core/services/sail-plan.service';

const WINDOW_MS = 15 * 60 * 1000;
const BUCKET_MS = 10_000;
const BUCKET_COUNT = WINDOW_MS / BUCKET_MS; // 90 bars

export interface PerfBar {
  /** 0–1 across the chart (left = oldest, right = now). */
  x: number;
  /** Bar height as fraction of yMax (0–1+). */
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

  /** SVG chart geometry (viewBox units). */
  readonly chartW = 320;
  readonly chartH = 160;
  readonly padL = 34;
  readonly padR = 10;
  readonly padT = 10;
  readonly padB = 24;

  bars: PerfBar[] = [];
  yMax = 120;
  yTicks: number[] = [0, 50, 75, 100];
  nowLabel = 'Now';

  private samples: PolarSample[] = [];
  private subs: Subscription[] = [];

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
        this.rebuildChart();
        this.cdr.markForCheck();
      }),
      this.polar.samples$.subscribe(samples => {
        this.samples = samples;
        this.rebuildChart();
        this.cdr.markForCheck();
      }),
      this.sailPlans.plan$.subscribe(plan => {
        this.planName = plan.name;
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
    const h = Math.min(bar.h, 1) * this.plotH;
    return this.padT + this.plotH - h;
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
    this.advice = this.sailPlans.advise(
      this.live.twaDeg,
      this.live.twsKnots,
      this.live.instantPolarPct,
    );
  }

  private rebuildChart(): void {
    const now = Date.now();
    const start = now - WINDOW_MS;
    const buckets: (number | null)[] = Array.from({ length: BUCKET_COUNT }, () => null);
    const counts = Array.from({ length: BUCKET_COUNT }, () => 0);

    for (const sample of this.samples) {
      if (sample.timestamp < start) continue;
      const idx = Math.min(
        BUCKET_COUNT - 1,
        Math.max(0, Math.floor((sample.timestamp - start) / BUCKET_MS)),
      );
      const prev = buckets[idx];
      if (prev === null) {
        buckets[idx] = sample.polarPct;
        counts[idx] = 1;
      } else {
        counts[idx] += 1;
        buckets[idx] = prev + (sample.polarPct - prev) / counts[idx];
      }
    }

    // Include the latest live point in the newest bucket so the right edge feels live.
    if (
      this.live.instantPolarPct !== null &&
      !this.live.stale &&
      this.live.lastUpdate &&
      now - this.live.lastUpdate < 15_000
    ) {
      const idx = BUCKET_COUNT - 1;
      const prev = buckets[idx];
      if (prev === null) {
        buckets[idx] = this.live.instantPolarPct;
      } else {
        buckets[idx] = (prev + this.live.instantPolarPct) / 2;
      }
    }

    const values = buckets.filter((v): v is number => v !== null);
    const peak = values.length ? Math.max(...values) : 100;
    this.yMax = Math.max(120, Math.ceil(peak / 10) * 10);
    this.yTicks = [0, 50, 75, 100].filter(t => t <= this.yMax);
    if (this.yMax > 100 && !this.yTicks.includes(this.yMax)) {
      this.yTicks = [...this.yTicks, this.yMax];
    }

    this.bars = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const value = buckets[i];
      if (value === null) continue;
      this.bars.push({
        x: i / BUCKET_COUNT,
        h: value / this.yMax,
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
