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
  /** Index 0 = oldest … last = now. */
  index: number;
  /** 0–100 height within the plot (clamped to yMax). */
  heightPct: number;
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

  /** Fixed plot height in CSS pixels — set on a plain div, not an SVG. */
  readonly chartHeightPx = 200;
  readonly yMax = 150;
  readonly yTicks = [150, 100, 75, 50, 0];

  bars: PerfBar[] = [];
  /** Sparse list including empty slots so layout stays 90 columns wide. */
  columns: Array<PerfBar | null> = [];

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

  tickTopPct(tick: number): number {
    return ((this.yMax - tick) / this.yMax) * 100;
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

  get hasBars(): boolean {
    return this.bars.length > 0;
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
    this.columns = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const key = oldestBucket + i;
      const entry = sums.get(key);
      if (!entry) {
        this.columns.push(null);
        continue;
      }
      const value = entry.sum / entry.count;
      const bar: PerfBar = {
        index: i,
        heightPct: (Math.min(value, this.yMax) / this.yMax) * 100,
        value,
        color: this.colorForPct(value),
      };
      this.bars.push(bar);
      this.columns.push(bar);
    }
  }

  private colorForPct(pct: number): string {
    if (pct < 50) return 'var(--polar-perf-low, #c0392b)';
    if (pct < 75) return 'var(--polar-perf-mid, #d4a017)';
    return 'var(--polar-perf-high, #1e9e5a)';
  }
}
