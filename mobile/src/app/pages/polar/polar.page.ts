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
  readonly chartH = 140;
  readonly padL = 34;
  readonly padR = 8;
  readonly padT = 8;
  readonly padB = 22;
  /** Rendered CSS height — applied as an inline style so it wins over `height: auto`. */
  readonly chartCssHeight = 200;

  bars: PerfBar[] = [];
  /** Fixed Y scale so historical bars do not resize when peaks change. */
  readonly yMax = 150;
  readonly yTicks = [0, 50, 75, 100, 150];
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
    // Absolute wall-clock buckets: a sample always maps to the same bucket key, so once
    // a 10s interval is complete its average (and color) never changes. Only the open
    // bucket at "now" keeps updating; older bars only scroll left as the window moves.
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
      const key = oldestBucket + i;
      const entry = sums.get(key);
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
