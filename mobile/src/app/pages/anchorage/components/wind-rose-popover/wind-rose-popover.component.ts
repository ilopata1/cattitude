import {
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { LatLon } from '../../core/models/vessel.model';
import { AnchorageSettingsService } from '../../core/services/anchorage-settings.service';
import { OpenMeteoService } from '../../core/services/open-meteo.service';
import { clockwiseSpanDegrees, normalizeDeg } from '../../core/calculators/wind-arc';

const CX = 100;
const CY = 100;
const R_OUT = 88;
const R_HANDLE = 72;
const HANDLE_HIT = 14;

@Component({
  selector: 'app-wind-rose-popover',
  templateUrl: './wind-rose-popover.component.html',
  styleUrls: ['./wind-rose-popover.component.scss'],
  standalone: false,
})
export class WindRosePopoverComponent implements OnInit, OnDestroy {
  @Input() mapCentre: LatLon | null = null;

  windUseInSwing = false;
  startDeg = 0;
  endDeg = 90;
  forecastLoading = false;
  forecastError: string | null = null;

  private sub?: Subscription;
  private drag: 'start' | 'end' | null = null;
  private dragSvg: SVGSVGElement | null = null;

  readonly labels: { bearing: number; text: string }[] = [
    { bearing: 0, text: 'N' },
    { bearing: 45, text: 'NE' },
    { bearing: 90, text: 'E' },
    { bearing: 135, text: 'SE' },
    { bearing: 180, text: 'S' },
    { bearing: 225, text: 'SW' },
    { bearing: 270, text: 'W' },
    { bearing: 315, text: 'NW' },
  ];

  constructor(
    private readonly settings: AnchorageSettingsService,
    private readonly openMeteo: OpenMeteoService,
  ) {}

  ngOnInit(): void {
    this.syncFromSettings();
    this.sub = this.settings.settings$.subscribe(() => this.syncFromSettings());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private syncFromSettings(): void {
    const s = this.settings.get();
    this.startDeg = normalizeDeg(s.windRangeStartDeg);
    this.endDeg = normalizeDeg(s.windRangeEndDeg);
    this.windUseInSwing = s.windUseInSwingCalculations;
  }

  get arcSpanDeg(): number {
    return clockwiseSpanDegrees(this.startDeg, this.endDeg);
  }

  get isFullCircle(): boolean {
    const span = this.arcSpanDeg;
    return span < 0.5 || span > 359.5;
  }

  get sectorPath(): string {
    if (this.isFullCircle) return '';
    return this.buildSectorPath(R_OUT * 0.35, R_OUT * 0.98, this.startDeg, this.endDeg);
  }

  get dimSectorPath(): string {
    if (this.isFullCircle || this.arcSpanDeg < 1e-3) return '';
    return this.buildSectorPath(R_OUT * 0.35, R_OUT * 0.98, this.endDeg, this.startDeg);
  }

  onUseWindToggle(checked: boolean): void {
    this.windUseInSwing = checked;
    this.settings.update({ windUseInSwingCalculations: checked });
  }

  loadForecast(): void {
    const c = this.mapCentre;
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon)) {
      this.forecastError = 'Map position not available yet.';
      return;
    }
    this.forecastError = null;
    this.forecastLoading = true;
    this.openMeteo.forecastWindDirectionArc(c.lat, c.lon).pipe(take(1)).subscribe({
      next: ({ startDeg, endDeg }) => {
        this.forecastLoading = false;
        this.startDeg = normalizeDeg(startDeg);
        this.endDeg = normalizeDeg(endDeg);
        this.settings.update({
          windRangeStartDeg: this.startDeg,
          windRangeEndDeg: this.endDeg,
        });
      },
      error: () => {
        this.forecastLoading = false;
        this.forecastError = 'Could not load forecast.';
      },
    });
  }

  handleStartXY(): { x: number; y: number } { return this.polar(R_HANDLE, this.startDeg); }
  handleEndXY(): { x: number; y: number } { return this.polar(R_HANDLE, this.endDeg); }

  private polar(r: number, bearingDeg: number): { x: number; y: number } {
    const rad = (bearingDeg * Math.PI) / 180;
    return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
  }

  labelXY(bearingDeg: number): { x: number; y: number } {
    return this.polar(R_OUT + 10, bearingDeg);
  }

  onSvgPointerDown(ev: PointerEvent): void {
    const svg = ev.currentTarget as SVGSVGElement;
    const p = this.eventToBearing(ev, svg);
    const which = this.hitHandle(p);
    this.drag = which;
    this.dragSvg = which ? svg : null;
    if (which) {
      svg.setPointerCapture(ev.pointerId);
      this.applyBearing(which, p.bearing);
    }
  }

  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(ev: PointerEvent): void {
    if (!this.drag || !this.dragSvg) return;
    this.applyBearing(this.drag, this.eventToBearing(ev, this.dragSvg).bearing);
  }

  @HostListener('document:pointerup', ['$event'])
  onDocumentPointerUp(ev: PointerEvent): void {
    if (!this.drag) return;
    try {
      if (this.dragSvg?.hasPointerCapture(ev.pointerId)) {
        this.dragSvg.releasePointerCapture(ev.pointerId);
      }
    } catch { /* ignore */ }
    this.settings.update({
      windRangeStartDeg: this.startDeg,
      windRangeEndDeg: this.endDeg,
    });
    this.drag = null;
    this.dragSvg = null;
  }

  private hitHandle(p: { x: number; y: number }): 'start' | 'end' | null {
    const hs = this.handleStartXY();
    const he = this.handleEndXY();
    const ds = Math.hypot(p.x - hs.x, p.y - hs.y);
    const de = Math.hypot(p.x - he.x, p.y - he.y);
    if (ds < HANDLE_HIT && ds <= de) return 'start';
    if (de < HANDLE_HIT) return 'end';
    return null;
  }

  private eventToBearing(ev: PointerEvent, svg: SVGSVGElement): { x: number; y: number; bearing: number } {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: CX, y: CY, bearing: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    let deg = (Math.atan2(p.x - CX, -(p.y - CY)) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return { x: p.x, y: p.y, bearing: normalizeDeg(deg) };
  }

  private applyBearing(which: 'start' | 'end', bearing: number): void {
    const snapped = Math.round(bearing);
    if (which === 'start') this.startDeg = normalizeDeg(snapped);
    else this.endDeg = normalizeDeg(snapped);
  }

  private buildSectorPath(r0: number, r1: number, startDeg: number, endDeg: number): string {
    const span = clockwiseSpanDegrees(startDeg, endDeg);
    const steps = Math.max(12, Math.ceil(span / 4));
    const outer: string[] = [];
    const inner: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = normalizeDeg(startDeg + span * t);
      const po = this.polar(r1, a);
      const pi = this.polar(r0, a);
      outer.push(`${po.x},${po.y}`);
      inner.unshift(`${pi.x},${pi.y}`);
    }
    const [ox, oy] = outer[0].split(',').map(Number);
    return `M ${ox} ${oy} L ${outer.join(' L ')} L ${inner.join(' L ')} Z`;
  }
}
