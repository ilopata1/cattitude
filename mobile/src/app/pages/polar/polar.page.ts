import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { PolarLiveState } from '../../core/models/polar.model';
import { PolarService } from '../../core/services/polar.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { SailAdvice, formatBand } from '../../core/models/sail-plan.model';
import { SailPlanService } from '../../core/services/sail-plan.service';

@Component({
  selector: 'app-polar',
  templateUrl: './polar.page.html',
  styleUrls: ['./polar.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PolarPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartHost', { static: false }) chartHost!: ElementRef<HTMLDivElement>;

  live: PolarLiveState = {
    stwKnots: null,
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
  polarFilename = '';
  advice: SailAdvice | null = null;
  planName = '';

  private subs: Subscription[] = [];
  private chartReady = false;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

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
        this.renderChart();
        this.cdr.markForCheck();
      }),
      this.sailPlans.plan$.subscribe(plan => {
        this.planName = plan.name;
        this.refreshAdvice();
        this.cdr.markForCheck();
      }),
      this.polar.polarFilename$.subscribe(name => {
        this.polarFilename = name;
        this.cdr.markForCheck();
      }),
      this.polar.polarPct$(5).subscribe(v => { this.pct5 = v; this.cdr.markForCheck(); }),
      this.polar.polarPct$(10).subscribe(v => { this.pct10 = v; this.cdr.markForCheck(); }),
      this.polar.polarPct$(15).subscribe(v => { this.pct15 = v; this.cdr.markForCheck(); }),
    );
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.chartReady = true;
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.svg?.remove();
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

  private refreshAdvice(): void {
    this.advice = this.sailPlans.advise(
      this.live.twaDeg,
      this.live.twsKnots,
      this.live.instantPolarPct,
    );
  }

  // ---------------------------------------------------------------------------
  // D3 chart

  private initChart(): void {
    if (!this.chartHost?.nativeElement) return;

    this.svg = d3.select(this.chartHost.nativeElement)
      .append('svg')
      .attr('viewBox', '0 0 400 240')
      .attr('role', 'img')
      .attr('aria-label', 'Polar performance chart');

    this.svg.append('g').attr('class', 'grid-rings');
    this.svg.append('path').attr('class', 'target-curve').attr('fill', 'none');
    this.svg.append('circle').attr('class', 'live-dot');
    this.svg.append('text').attr('class', 'chart-title').attr('text-anchor', 'middle');
  }

  private renderChart(): void {
    if (!this.chartReady || !this.svg) return;

    const width = 400;
    const height = 240;
    const cx = width / 2;
    const cy = height - 20;
    const maxRadius = 190;

    const curve = this.polar.targetCurve(this.live.twsKnots);
    const maxSpeed = Math.max(
      8,
      ...curve.map(p => p.targetKnots),
      this.live.stwKnots ?? 0,
    );

    const radius = d3.scaleLinear().domain([0, maxSpeed]).range([0, maxRadius]);
    const angle = (twaDeg: number) => (Math.PI / 2) - (twaDeg / 180) * Math.PI;

    const toPoint = (twaDeg: number, speedKnots: number): [number, number] => {
      const r = radius(speedKnots);
      const a = angle(twaDeg);
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    };

    const rings = d3.range(2, Math.ceil(maxSpeed / 2) + 1, 2);
    const grid = this.svg.select<SVGGElement>('.grid-rings');
    grid.selectAll<SVGPathElement, number>('path')
      .data(rings)
      .join('path')
      .attr('d', d => {
        const r = radius(d);
        return d3.arc()({
          innerRadius: r,
          outerRadius: r,
          startAngle: -Math.PI / 2,
          endAngle: Math.PI / 2,
        })!;
      })
      .attr('transform', `translate(${cx}, ${cy})`)
      .attr('fill', 'none')
      .attr('stroke', 'var(--ion-color-step-200, #ddd)')
      .attr('stroke-dasharray', '3 3');

    grid.selectAll<SVGTextElement, number>('text')
      .data(rings)
      .join('text')
      .attr('x', cx)
      .attr('y', d => cy - radius(d) - 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', 'var(--ion-color-medium, #888)')
      .text(d => `${d} kn`);

    const lineGen = d3.line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(d3.curveCatmullRom.alpha(0.5));

    const curvePoints = curve.map(p => toPoint(p.twaDeg, p.targetKnots));
    this.svg.select<SVGPathElement>('.target-curve')
      .attr('d', curvePoints.length > 1 ? lineGen(curvePoints) : null)
      .attr('stroke', 'var(--ion-color-primary, #3880ff)')
      .attr('stroke-width', 2.5);

    const dot = this.svg.select<SVGCircleElement>('.live-dot');
    if (this.live.stwKnots !== null && this.live.twaDeg !== null && !this.live.stale) {
      const [x, y] = toPoint(this.live.twaDeg, this.live.stwKnots);
      dot
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 7)
        .attr('fill', 'var(--ion-color-success, #2dd36f)')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('opacity', 1);
    } else {
      dot.style('opacity', 0);
    }

    const title = this.live.twsKnots !== null
      ? `Target polar at ${this.live.twsKnots.toFixed(0)} kn TWS`
      : 'Target polar (waiting for wind data)';

    this.svg.select<SVGTextElement>('.chart-title')
      .attr('x', cx)
      .attr('y', 18)
      .attr('font-size', 13)
      .attr('fill', 'var(--ion-color-medium, #888)')
      .text(title);

    // TWA axis labels
    const twaLabels = [0, 45, 90, 135, 180];
    grid.selectAll<SVGTextElement, number>('text.twa-label')
      .data(twaLabels)
      .join('text')
      .attr('class', 'twa-label')
      .attr('x', d => toPoint(d, 0)[0])
      .attr('y', d => toPoint(d, 0)[1] + (d === 0 ? -8 : d === 180 ? 16 : 14))
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', 'var(--ion-color-medium, #888)')
      .text(d => `${d}°`);
  }
}
