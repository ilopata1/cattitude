import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AnchorageVesselStoreService } from './core/services/anchorage-vessel-store.service';
import { AnchorageAlertService } from './core/services/anchorage-alert.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { Vessel, VesselState, LatLon } from './core/models/vessel.model';
import { AnchorageAlert } from './core/models/anchorage.model';

// Leaflet is loaded dynamically to keep the bundle clean and avoid SSR issues.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let L: any;

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

/** Match SwingCircle map visuals. */
const ESRI_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Tiles © Esri';
const MIN_VESSEL_VIEWPORT_FRACTION = 0.015;
const VESSEL_FILL_OWN = '#ADFF2F';
const VESSEL_FILL_OTHER = '#FF007F';
const VESSEL_STROKE_COLOR = '#111111';
const VESSEL_ICON_ASPECT = 40 / 60;
const VESSEL_ICON_ANCHOR_Y_FRAC = 26 / 60;
/** Minimum marker hit box so hover tips are easy to trigger and keep open. */
const VESSEL_HIT_MIN_PX = 52;
/** Keep tip visible briefly after leaving the hit box (ms). */
const HOVER_TIP_CLOSE_MS = 1200;

const STATE_COLOUR: Record<VesselState, string> = {
  green:   '#2ecc71',
  amber:   '#f39c12',
  red:     '#e74c3c',
  moving:  '#3498db',
  unknown: '#95a5a6',
};

@Component({
  selector: 'app-anchorage',
  templateUrl: './anchorage.page.html',
  styleUrls: ['./anchorage.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AnchoragePage implements OnInit, AfterViewInit, OnDestroy, ViewWillEnter {

  private static readonly DEFAULT_ZOOM = 15;

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  vessels: Vessel[] = [];
  activeAlerts: AnchorageAlert[] = [];
  selectedVessel: Vessel | null = null;
  isRecording = false;
  skConnected = false;
  viewMode: 'myboat' | 'anchorage' = 'anchorage';
  windMapCentre: LatLon | null = null;

  private map: unknown = null;
  private markers = new Map<string, unknown>();       // mmsi → L.Marker (boat icon)
  private circles = new Map<string, unknown>();       // mmsi → L.Circle
  private anchorMarkers = new Map<string, unknown>(); // mmsi → L.CircleMarker
  /** Single shared hover label — never opened via Leaflet's touch/click path. */
  private hoverTip: unknown = null;
  private hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;
  /** MMSI currently under the pointer (survives marker icon refreshes). */
  private hoveredMmsi: string | null = null;
  private readonly hoverLabels = new Map<string, string>();
  private subs: Subscription[] = [];
  private leafletReady = false;
  /** Set after the first successful center on own vessel. */
  private hasCenteredOnOwn = false;
  /** User panned or zoomed — suppress automatic re-centering. */
  private userAdjustedMap = false;

  constructor(
    private readonly vesselStore: AnchorageVesselStoreService,
    private readonly alertService: AnchorageAlertService,
    private readonly sk: SignalKService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.vesselStore.ensureRestored();

    this.subs.push(
      this.sk.connected$.subscribe(c => {
        this.skConnected = c;
        if (c) this.vesselStore.start();
        this.cdr.markForCheck();
      }),
    );

    this.subs.push(
      this.vesselStore.vessels$.subscribe(vessels => {
        this.vessels = vessels;
        this.isRecording = this.vesselStore.isRecording;
        if (this.selectedVessel) {
          this.selectedVessel = vessels.find(v => v.mmsi === this.selectedVessel!.mmsi) ?? null;
        }
        this.updateMap();
        this.cdr.markForCheck();
      }),
      this.alertService.activeAlerts$.subscribe(alerts => {
        this.activeAlerts = alerts;
        this.cdr.markForCheck();
      }),
    );
  }

  ngAfterViewInit(): void {
    void this.loadLeaflet().then(() => {
      this.initMap();
      this.leafletReady = true;
      this.updateMap();
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.vesselStore.stop();
  }

  ionViewWillEnter(): void {
    if (this.skConnected) this.vesselStore.start();
    requestAnimationFrame(() => {
      if (!this.map) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).invalidateSize();
      this.centerOnOwnVessel(false);
      this.updateMap();
    });
  }

  // ---------------------------------------------------------------------------
  // User actions

  recenterOnBoat(): void {
    this.userAdjustedMap = false;
    this.centerOnOwnVessel(true);
  }

  onViewModeChange(mode: 'myboat' | 'anchorage'): void {
    this.viewMode = mode;
    this.updateMap();
    this.cdr.markForCheck();
  }

  selectVessel(vessel: Vessel): void {
    this.selectedVessel = vessel;
    this.cdr.markForCheck();
  }

  dismissVesselDetail(): void {
    this.selectedVessel = null;
    this.cdr.markForCheck();
  }

  focusOnAlert(alert: AnchorageAlert): void {
    const vessel = this.vessels.find(v => v.mmsi === alert.vesselMmsi)
      ?? this.vessels.find(v => v.mmsi === alert.otherMmsi);
    if (vessel) this.selectVessel(vessel);
  }

  startRecording(): void {
    this.vesselStore.startRecording();
    this.isRecording = true;
    this.updateMap();
    this.cdr.markForCheck();
  }

  stopRecording(): void {
    this.vesselStore.stopRecording();
    this.vesselStore.stop();
    this.isRecording = false;
    this.updateMap();
    this.cdr.markForCheck();
  }

  clearAll(): void {
    this.stopRecording();
    this.vesselStore.clear();
    this.selectedVessel = null;
    this.clearMapLayers();
  }

  get listVessels(): Vessel[] {
    return this.filterVesselsForView(this.vessels);
  }

  // ---------------------------------------------------------------------------
  // Helpers

  /** True when AIS published a real ship name (not just the MMSI fallback). */
  hasShipName(v: Vessel): boolean {
    const name = (v.name ?? '').trim();
    return !!name && name !== v.mmsi;
  }

  displayName(v: Vessel): string {
    return this.hasShipName(v) ? toHeadingCase(v.name.trim()) : `MMSI ${v.mmsi}`;
  }

  tooltipLabel(v: Vessel): string {
    return this.displayName(v);
  }

  stateBadgeColour(state: VesselState): string {
    return STATE_COLOUR[state] ?? STATE_COLOUR.unknown;
  }

  stateLabel(state: VesselState): string {
    const labels: Record<VesselState, string> = {
      green: 'Clear', amber: 'Caution', red: 'Conflict',
      moving: 'Moving', unknown: 'Unknown',
    };
    return labels[state] ?? 'Unknown';
  }

  trackByMmsi(_: number, v: Vessel): string { return v.mmsi; }

  // ---------------------------------------------------------------------------
  // Leaflet

  private async loadLeaflet(): Promise<void> {
    if (typeof L !== 'undefined') return;

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    await new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${LEAFLET_JS}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src   = LEAFLET_JS;
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Leaflet failed to load'));
      document.head.appendChild(script);
    });
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = (L as any).map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: AnchoragePage.DEFAULT_ZOOM,
      zoomControl: false,
      zoomSnap: 1,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 120,
    });
    this.map = map;

    map.on('dragstart', () => {
      this.userAdjustedMap = true;
      this.closeAllTooltips();
    });
    map.on('zoomstart', (e: { originalEvent?: Event }) => {
      if (e.originalEvent) this.userAdjustedMap = true;
      this.closeAllTooltips();
    });
    map.on('click', () => this.closeAllTooltips());
    map.on('zoomend', () => this.updateMap());
    map.on('moveend', () => this.updateWindMapCentre());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L as any).tileLayer(ESRI_TILE_URL, {
      attribution: ESRI_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L as any).control.zoom({ position: 'bottomright' }).addTo(map);
    this.updateWindMapCentre();
  }

  private updateWindMapCentre(): void {
    if (!this.map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (this.map as any).getCenter();
    this.windMapCentre = { lat: c.lat, lon: c.lng };
    this.cdr.markForCheck();
  }

  private filterVesselsForView(vessels: Vessel[]): Vessel[] {
    if (this.viewMode === 'anchorage') return vessels;
    const conflicting = new Set<string>();
    for (const a of this.activeAlerts) {
      conflicting.add(a.vesselMmsi);
      conflicting.add(a.otherMmsi);
    }
    return vessels.filter(v => v.isOwn || conflicting.has(v.mmsi));
  }

  private updateMap(): void {
    if (!this.leafletReady || !this.map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    const visible = this.filterVesselsForView(this.vessels);
    const seenMmsis = new Set<string>();
    const minLengthM = this.getMinVesselLengthMetres();

    for (const vessel of visible) {
      const last = vessel.positions[vessel.positions.length - 1];
      if (!last) continue;

      seenMmsis.add(vessel.mmsi);
      const colour = STATE_COLOUR[vessel.state];
      const isStale = this.vesselStore.isStale(vessel);
      const label = this.tooltipLabel(vessel);
      this.hoverLabels.set(vessel.mmsi, label);
      const iconKey = this.vesselIconKey(
        last.heading,
        vessel.lengthMetres,
        minLengthM,
        isStale,
        vessel.isOwn,
      );

      if (this.markers.has(vessel.mmsi)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = this.markers.get(vessel.mmsi) as any;
        marker.setLatLng([last.lat, last.lon]);
        if (marker._cattitudeIconKey !== iconKey) {
          marker.setIcon(this.buildVesselIcon(
            last.heading,
            vessel.lengthMetres,
            minLengthM,
            isStale,
            vessel.isOwn,
            vessel.mmsi,
          ));
          marker._cattitudeIconKey = iconKey;
        }
      } else {
        const icon = this.buildVesselIcon(
          last.heading,
          vessel.lengthMetres,
          minLengthM,
          isStale,
          vessel.isOwn,
          vessel.mmsi,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = (L as any).marker([last.lat, last.lon], { icon }).addTo(map);
        marker._cattitudeIconKey = iconKey;
        this.bindHoverTooltip(marker, vessel.mmsi);
        const mmsi = vessel.mmsi;
        marker.on('click', () => {
          this.closeAllTooltips();
          const v = this.vessels.find(x => x.mmsi === mmsi);
          if (v) this.selectVessel(v);
        });
        this.markers.set(vessel.mmsi, marker);
      }

      if (vessel.tracked && vessel.anchorPoint && vessel.swingRadius > 0) {
        const dashArray = vessel.confidence === 'low' ? '6,4' : undefined;
        const circleStyle = {
          color: colour,
          fillColor: colour,
          fillOpacity: 0.12,
          weight: 2,
          opacity: isStale ? 0.3 : 0.8,
          dashArray,
        };

        if (this.circles.has(vessel.mmsi)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const circle = this.circles.get(vessel.mmsi) as any;
          circle.setLatLng([vessel.anchorPoint.lat, vessel.anchorPoint.lon]);
          circle.setRadius(vessel.swingRadius);
          circle.setStyle(circleStyle);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const circle = (L as any).circle(
            [vessel.anchorPoint.lat, vessel.anchorPoint.lon],
            { radius: vessel.swingRadius, ...circleStyle, interactive: false },
          ).addTo(map);
          this.circles.set(vessel.mmsi, circle);
        }

        if (vessel.confidence !== 'low') {
          if (this.anchorMarkers.has(vessel.mmsi)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.anchorMarkers.get(vessel.mmsi) as any)
              .setLatLng([vessel.anchorPoint.lat, vessel.anchorPoint.lon]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.anchorMarkers.get(vessel.mmsi) as any).setStyle({ fillColor: colour });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const anchorMark = (L as any).circleMarker(
              [vessel.anchorPoint.lat, vessel.anchorPoint.lon],
              {
                radius: 3,
                color: '#ffffff',
                fillColor: colour,
                fillOpacity: 1,
                weight: 1,
              },
            ).addTo(map);
            this.anchorMarkers.set(vessel.mmsi, anchorMark);
          }
        } else if (this.anchorMarkers.has(vessel.mmsi)) {
          map.removeLayer(this.anchorMarkers.get(vessel.mmsi));
          this.anchorMarkers.delete(vessel.mmsi);
        }
      } else {
        if (this.circles.has(vessel.mmsi)) {
          map.removeLayer(this.circles.get(vessel.mmsi));
          this.circles.delete(vessel.mmsi);
        }
        if (this.anchorMarkers.has(vessel.mmsi)) {
          map.removeLayer(this.anchorMarkers.get(vessel.mmsi));
          this.anchorMarkers.delete(vessel.mmsi);
        }
      }
    }

    for (const [mmsi, marker] of this.markers) {
      if (!seenMmsis.has(mmsi)) {
        map.removeLayer(marker);
        this.markers.delete(mmsi);
        this.hoverLabels.delete(mmsi);
        if (this.hoveredMmsi === mmsi) this.closeAllTooltips();
      }
    }
    for (const [mmsi, circle] of this.circles) {
      if (!seenMmsis.has(mmsi)) {
        map.removeLayer(circle);
        this.circles.delete(mmsi);
      }
    }
    for (const [mmsi, anchor] of this.anchorMarkers) {
      if (!seenMmsis.has(mmsi)) {
        map.removeLayer(anchor);
        this.anchorMarkers.delete(mmsi);
      }
    }

    this.refreshOpenHoverTip();
    this.centerOnOwnVessel(false);
  }

  private getMinVesselLengthMetres(): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    const container = map.getContainer();
    const minDimPx = Math.min(container.clientWidth, container.clientHeight);
    const minPx = minDimPx * MIN_VESSEL_VIEWPORT_FRACTION;
    const bounds = map.getBounds();
    const mapWidthM = map.distance(bounds.getSouthWest(), bounds.getSouthEast());
    const metresPerPx = mapWidthM / container.clientWidth;
    return minPx * metresPerPx;
  }

  private metresToPixels(metres: number): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    const container = map.getContainer();
    const bounds = map.getBounds();
    const mapWidthM = map.distance(bounds.getSouthWest(), bounds.getSouthEast());
    const metresPerPx = mapWidthM / container.clientWidth;
    return metres / metresPerPx;
  }

  private buildVesselIcon(
    headingDeg: number,
    lengthM: number,
    minLengthM: number,
    isStale: boolean,
    isOwn: boolean,
    mmsi: string,
  ): unknown {
    let drawLength = lengthM;
    if (drawLength < minLengthM) drawLength = minLengthM;

    const heightPx = Math.max(14, Math.round(this.metresToPixels(drawLength)));
    const widthPx = Math.round(heightPx * VESSEL_ICON_ASPECT);
    const hitW = Math.max(widthPx, VESSEL_HIT_MIN_PX);
    const hitH = Math.max(heightPx, VESSEL_HIT_MIN_PX);
    const padX = (hitW - widthPx) / 2;
    const padY = (hitH - heightPx) / 2;
    const anchorX = padX + widthPx / 2;
    const anchorY = padY + heightPx * VESSEL_ICON_ANCHOR_Y_FRAC;
    const shadowId = `vessel-shadow-${mmsi.replace(/\W/g, '')}`;
    const opacity = isStale ? 0.4 : 1;
    const strokeWidth = isOwn ? 4 : 3;
    const fillColor = isOwn ? VESSEL_FILL_OWN : VESSEL_FILL_OTHER;
    const originY = `${VESSEL_ICON_ANCHOR_Y_FRAC * 100}%`;

    const html = `<div class="vessel-marker-hit" style="width:${hitW}px;height:${hitH}px;position:relative;">
      <div class="vessel-marker-wrap" style="position:absolute;left:${padX}px;top:${padY}px;width:${widthPx}px;height:${heightPx}px;opacity:${opacity};">
        <div class="vessel-marker-inner" style="transform:rotate(${headingDeg}deg);transform-origin:50% ${originY};width:100%;height:100%;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60" width="100%" height="100%">
            <defs>
              <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
              </filter>
            </defs>
            <path d="M 20,2 L 38,50 L 20,38 L 2,50 Z"
                  fill="${fillColor}"
                  stroke="${VESSEL_STROKE_COLOR}"
                  stroke-width="${strokeWidth}"
                  stroke-linejoin="round"
                  filter="url(#${shadowId})" />
          </svg>
        </div>
      </div>
    </div>`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (L as any).divIcon({
      className: 'vessel-marker-leaflet',
      html,
      iconSize: [hitW, hitH],
      iconAnchor: [anchorX, anchorY],
    });
  }

  private centerOnOwnVessel(force: boolean): void {
    if (!this.map || (!force && (this.userAdjustedMap || this.hasCenteredOnOwn))) return;

    const own = this.vessels.find(v => v.isOwn);
    const p = own?.positions[own.positions.length - 1];
    if (!p) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    const zoom = force ? map.getZoom() : AnchoragePage.DEFAULT_ZOOM;
    map.setView([p.lat, p.lon], zoom, { animate: force });
    this.hasCenteredOnOwn = true;
  }

  private vesselIconKey(
    headingDeg: number,
    lengthM: number,
    minLengthM: number,
    isStale: boolean,
    isOwn: boolean,
  ): string {
    let drawLength = lengthM;
    if (drawLength < minLengthM) drawLength = minLengthM;
    const heightPx = Math.max(14, Math.round(this.metresToPixels(drawLength)));
    return `${Math.round(headingDeg)}|${heightPx}|${isStale ? 1 : 0}|${isOwn ? 1 : 0}`;
  }

  /**
   * Leaflet opens non-permanent tooltips on click when the browser reports touch
   * (common on Windows), and they stick open. Drive hover labels ourselves instead.
   */
  private bindHoverTooltip(
    marker: {
      unbindTooltip?: Function;
      getTooltip?: Function;
      getLatLng: Function;
      off: Function;
      on: Function;
    },
    mmsi: string,
  ): void {
    if (marker.getTooltip?.()) marker.unbindTooltip?.();
    if (!this.mapSupportsHover() || !this.map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    if (!this.hoverTip) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.hoverTip = (L as any).tooltip({
        permanent: false,
        direction: 'top',
        offset: [0, -8],
        opacity: 0.9,
        className: 'vessel-name-tooltip',
        interactive: false,
      });
    }

    marker.on('mouseover', () => {
      if (this.hoverCloseTimer !== null) {
        clearTimeout(this.hoverCloseTimer);
        this.hoverCloseTimer = null;
      }
      this.hoveredMmsi = mmsi;
      this.showHoverTipFor(mmsi);
    });
    marker.on('mouseout', () => {
      if (this.hoverCloseTimer !== null) clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = setTimeout(() => {
        this.hoverCloseTimer = null;
        if (this.hoveredMmsi !== mmsi) return;
        this.hoveredMmsi = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tip = this.hoverTip as any;
        if (tip && map.hasLayer(tip)) map.removeLayer(tip);
      }, HOVER_TIP_CLOSE_MS);
    });
  }

  private showHoverTipFor(mmsi: string): void {
    if (!this.map || !this.hoverTip) return;
    const marker = this.markers.get(mmsi) as { getLatLng: Function } | undefined;
    const label = this.hoverLabels.get(mmsi);
    if (!marker || !label) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tip = this.hoverTip as any;
    tip.setContent(label);
    tip.setLatLng(marker.getLatLng());
    if (!map.hasLayer(tip)) tip.addTo(map);
  }

  private refreshOpenHoverTip(): void {
    if (!this.hoveredMmsi) return;
    this.showHoverTipFor(this.hoveredMmsi);
  }

  private mapSupportsHover(): boolean {
    return typeof window !== 'undefined'
      && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  }

  private closeAllTooltips(): void {
    if (this.hoverCloseTimer !== null) {
      clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = null;
    }
    this.hoveredMmsi = null;
    if (!this.map || !this.hoverTip) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tip = this.hoverTip as any;
    if (map.hasLayer(tip)) map.removeLayer(tip);
  }

  private clearMapLayers(): void {
    if (!this.map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    this.closeAllTooltips();
    for (const m of this.markers.values()) map.removeLayer(m);
    for (const c of this.circles.values()) map.removeLayer(c);
    for (const a of this.anchorMarkers.values()) map.removeLayer(a);
    this.markers.clear();
    this.circles.clear();
    this.anchorMarkers.clear();
    this.hoverLabels.clear();
  }
}

/** AIS names are often ALL CAPS — show as Heading Case in the UI. */
function toHeadingCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b([a-z])/g, ch => ch.toUpperCase());
}
