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
import { haversineDistance } from './core/calculators/anchor.calculator';

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
/** Hull outline stretched to the vessel's real length and beam. */
const HULL_PATH = 'M 20,2 L 38,50 L 20,38 L 2,50 Z';
/** Tight around the hull path so it fills the icon box exactly. */
const HULL_VIEWBOX = '2 2 36 48';
const MIN_HULL_LENGTH_PX = 14;
const MIN_HULL_BEAM_PX = 5;
/** Used when AIS reports no beam — a plausible length-to-beam ratio. */
const ASSUMED_BEAM_RATIO = 0.3;
/** Minimum pointer radius around a vessel that counts as a hover, in pixels. */
const VESSEL_HIT_MIN_RADIUS_PX = 26;
/** Upper bound on map redraws, independent of AIS delta rate. */
const RENDER_INTERVAL_MS = 500;
/** Quiet period after a manual pan/zoom before the map follows the boat again. */
const FOLLOW_RESUME_MS = 30_000;
/** Fraction of the viewport treated as the edge when deciding to follow. */
const FOLLOW_EDGE_INSET = 0.08;

interface VesselGeometry {
  lengthPx: number;
  beamPx: number;
  /** Reference point along the hull: 0 at the bow, 1 at the stern. */
  alongFrac: number;
  /** Reference point across the hull: 0 at the port side, 1 at starboard. */
  acrossFrac: number;
  /** Radius of the square hit box centred on the reference point. */
  reachPx: number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Circle covering the drawn hull, for pointer hit-testing. Centred on the hull
 * rather than the reported position, which can sit right up at the bow.
 */
function hullHitCircle(
  geom: VesselGeometry,
  headingDeg: number,
): { centre: { x: number; y: number }; radius: number } {
  const { lengthPx, beamPx, alongFrac, acrossFrac } = geom;
  // Hull centre relative to the reference point, bow-up: +x starboard, +y aft.
  const dx = (0.5 - acrossFrac) * beamPx;
  const dy = (0.5 - alongFrac) * lengthPx;
  const rad = headingDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    centre: { x: dx * cos - dy * sin, y: dx * sin + dy * cos },
    radius: Math.max(VESSEL_HIT_MIN_RADIUS_PX, Math.hypot(beamPx, lengthPx) / 2),
  };
}

/** Reported beam, or an estimate from length when AIS omits it. */
function hullBeamMetres(vessel: Vessel): number {
  const reported = vessel.beamMetres;
  const estimated = vessel.lengthMetres * ASSUMED_BEAM_RATIO;
  // Reject implausible values, including the fixed placeholder beam that older
  // records carry for targets which never reported one.
  if (!reported || reported < vessel.lengthMetres / 10 || reported > vessel.lengthMetres) {
    return estimated;
  }
  return reported;
}

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
  /** Pinned name labels — the only way to read names without a mouse. */
  showLabels = false;

  private map: unknown = null;
  private markers = new Map<string, unknown>();       // mmsi → L.Marker (boat icon)
  private circles = new Map<string, unknown>();       // mmsi → L.Circle
  private anchorMarkers = new Map<string, unknown>(); // mmsi → L.CircleMarker
  /** Single shared hover label — never opened via Leaflet's touch/click path. */
  private hoverTip: unknown = null;
  /** MMSI currently under the pointer (survives marker icon refreshes). */
  private hoveredMmsi: string | null = null;
  private readonly hoverLabels = new Map<string, string>();
  /** mmsi → pointer radius in pixels that counts as hovering that vessel. */
  private readonly hoverRadii = new Map<string, number>();
  /** Hull centre relative to the reported position, in rotated screen pixels. */
  private readonly hoverOffsets = new Map<string, { x: number; y: number }>();
  private subs: Subscription[] = [];
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private leafletReady = false;
  /** Set after the first successful center on own vessel. */
  private hasCenteredOnOwn = false;
  /** User panned or zoomed — suppress the initial automatic centering. */
  private userAdjustedMap = false;
  /** When the user last moved the map, so following does not fight them. */
  private lastUserMapMove = 0;

  constructor(
    private readonly vesselStore: AnchorageVesselStoreService,
    private readonly alertService: AnchorageAlertService,
    private readonly sk: SignalKService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.showLabels = !this.mapSupportsHover();
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
        this.scheduleRender();
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
    if (this.renderTimer !== null) clearTimeout(this.renderTimer);
    // Keep watching for swing conflicts while recording, even off-screen.
    if (!this.vesselStore.isRecording) this.vesselStore.stop();
  }

  /**
   * A busy anchorage produces many deltas per second; redrawing every marker
   * and running change detection on each one starves the browser.
   */
  private scheduleRender(): void {
    if (this.renderTimer !== null) return;
    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.updateMap();
      this.cdr.markForCheck();
    }, RENDER_INTERVAL_MS);
  }

  ionViewWillEnter(): void {
    if (this.skConnected && !this.vesselStore.isRunning) this.vesselStore.start();
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
    this.lastUserMapMove = 0;
    this.centerOnOwnVessel(true);
  }

  onViewModeChange(mode: 'myboat' | 'anchorage'): void {
    this.viewMode = mode;
    this.updateMap();
    this.cdr.markForCheck();
  }

  toggleLabels(): void {
    this.showLabels = !this.showLabels;
    this.closeAllTooltips();
    this.updateMap();
    this.cdr.markForCheck();
  }

  selectVessel(vessel: Vessel): void {
    this.selectedVessel = vessel;
    this.cdr.markForCheck();
  }

  private selectByMmsi(mmsi: string): void {
    this.closeAllTooltips();
    const vessel = this.vessels.find(v => v.mmsi === mmsi);
    if (vessel) this.selectVessel(vessel);
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
    const own = this.vessels.find(v => v.isOwn);
    const ownPos = lastPosition(own);
    const list = this.filterVesselsForView(this.vessels).slice();
    list.sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      const da = distanceFrom(ownPos, a);
      const db = distanceFrom(ownPos, b);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return list;
  }

  // ---------------------------------------------------------------------------
  // Helpers

  /** Metres from own vessel's latest fix, or null when either side has no position. */
  distanceFromOwn(v: Vessel): number | null {
    if (v.isOwn) return null;
    return distanceFrom(lastPosition(this.vessels.find(x => x.isOwn)), v);
  }

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
      this.lastUserMapMove = Date.now();
      this.closeAllTooltips();
    });
    map.on('zoomstart', (e: { originalEvent?: Event }) => {
      if (e.originalEvent) {
        this.userAdjustedMap = true;
        this.lastUserMapMove = Date.now();
      }
      this.closeAllTooltips();
    });
    map.on('click', () => this.closeAllTooltips());
    map.on('zoomend', () => this.updateMap());
    map.on('moveend', () => this.updateWindMapCentre());

    if (this.mapSupportsHover()) {
      map.on('mousemove', (e: { containerPoint: { x: number; y: number } }) => {
        this.updateHoverFromPointer(e.containerPoint);
      });
      map.on('mouseout', () => this.closeAllTooltips());
    }

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
      const geom = this.vesselGeometry(vessel, minLengthM);
      const hit = hullHitCircle(geom, last.heading);
      this.hoverRadii.set(vessel.mmsi, hit.radius);
      this.hoverOffsets.set(vessel.mmsi, hit.centre);
      const iconKey = this.vesselIconKey(geom, last.heading, isStale, vessel.isOwn);

      if (this.markers.has(vessel.mmsi)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = this.markers.get(vessel.mmsi) as any;
        marker.setLatLng([last.lat, last.lon]);
        this.syncPinnedLabel(marker, label);
        if (marker._cattitudeIconKey !== iconKey) {
          marker.setIcon(this.buildVesselIcon(
            geom,
            last.heading,
            isStale,
            vessel.isOwn,
            vessel.mmsi,
          ));
          marker._cattitudeIconKey = iconKey;
        }
      } else {
        const icon = this.buildVesselIcon(
          geom,
          last.heading,
          isStale,
          vessel.isOwn,
          vessel.mmsi,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = (L as any).marker([last.lat, last.lon], { icon }).addTo(map);
        marker._cattitudeIconKey = iconKey;
        this.syncPinnedLabel(marker, label);
        marker.on('click', () => this.selectByMmsi(vessel.mmsi));
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
            { radius: vessel.swingRadius, ...circleStyle, interactive: true },
          ).addTo(map);
          // The circle is a far bigger target than the hull, especially on touch.
          circle.on('click', () => this.selectByMmsi(vessel.mmsi));
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
        this.hoverRadii.delete(mmsi);
        this.hoverOffsets.delete(mmsi);
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
    this.followOwnVessel();
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

  /**
   * Hull footprint in pixels plus where the reported position sits on it.
   *
   * AIS gives the position at the antenna, not the middle of the boat, so the
   * icon is anchored (and rotated) about that point rather than amidships.
   */
  private vesselGeometry(vessel: Vessel, minLengthM: number): VesselGeometry {
    const hullBeamM = hullBeamMetres(vessel);
    const drawLength = Math.max(vessel.lengthMetres, minLengthM);
    // Keep the beam in proportion when a small vessel is floored to stay visible.
    const scale = vessel.lengthMetres > 0 ? drawLength / vessel.lengthMetres : 1;

    const lengthPx = Math.max(MIN_HULL_LENGTH_PX, Math.round(this.metresToPixels(drawLength)));
    const beamPx = Math.max(MIN_HULL_BEAM_PX, Math.round(this.metresToPixels(hullBeamM * scale)));

    const { fromBow, fromCenter } = vessel.aisRef;
    const alongFrac = fromBow != null && vessel.lengthMetres > 0
      ? clamp01(fromBow / vessel.lengthMetres)
      : 0.5;
    const acrossFrac = fromCenter != null && hullBeamM > 0
      ? clamp01(0.5 - fromCenter / hullBeamM)
      : 0.5;

    // Furthest hull corner from the reference point — the hit box must hold it
    // at any heading, so the box is a square of that radius.
    let reachPx = 0;
    for (const cx of [0, 1]) {
      for (const cy of [0, 1]) {
        reachPx = Math.max(
          reachPx,
          Math.hypot((cx - acrossFrac) * beamPx, (cy - alongFrac) * lengthPx),
        );
      }
    }
    reachPx = Math.max(VESSEL_HIT_MIN_RADIUS_PX, reachPx);

    return { lengthPx, beamPx, alongFrac, acrossFrac, reachPx };
  }

  private buildVesselIcon(
    geom: VesselGeometry,
    headingDeg: number,
    isStale: boolean,
    isOwn: boolean,
    mmsi: string,
  ): unknown {
    const { lengthPx, beamPx, alongFrac, acrossFrac, reachPx } = geom;
    const box = Math.round(reachPx * 2);
    const padX = box / 2 - acrossFrac * beamPx;
    const padY = box / 2 - alongFrac * lengthPx;
    const shadowId = `vessel-shadow-${mmsi.replace(/\W/g, '')}`;
    const opacity = isStale ? 0.4 : 1;
    const strokeWidth = isOwn ? 4 : 3;
    const fillColor = isOwn ? VESSEL_FILL_OWN : VESSEL_FILL_OTHER;
    const originX = `${acrossFrac * 100}%`;
    const originY = `${alongFrac * 100}%`;

    const html = `<div class="vessel-marker-hit" style="width:${box}px;height:${box}px;position:relative;">
      <div class="vessel-marker-wrap" style="position:absolute;left:${padX}px;top:${padY}px;width:${beamPx}px;height:${lengthPx}px;opacity:${opacity};">
        <div class="vessel-marker-inner" style="transform:rotate(${headingDeg}deg);transform-origin:${originX} ${originY};width:100%;height:100%;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${HULL_VIEWBOX}"
               width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
              </filter>
            </defs>
            <path d="${HULL_PATH}"
                  fill="${fillColor}"
                  stroke="${VESSEL_STROKE_COLOR}"
                  stroke-width="${strokeWidth}"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                  filter="url(#${shadowId})" />
          </svg>
        </div>
      </div>
    </div>`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (L as any).divIcon({
      className: 'vessel-marker-leaflet',
      html,
      iconSize: [box, box],
      iconAnchor: [box / 2, box / 2],
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

  /**
   * Pan back once the boat drifts out of view. Held off briefly after a manual
   * pan or zoom so looking at a neighbour is not immediately undone.
   */
  private followOwnVessel(): void {
    if (!this.map || !this.hasCenteredOnOwn) return;
    if (Date.now() - this.lastUserMapMove < FOLLOW_RESUME_MS) return;

    const own = this.vessels.find(v => v.isOwn);
    const p = own?.positions[own.positions.length - 1];
    if (!p) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;
    // Inset the bounds so the pan happens as the boat nears the edge.
    if (map.getBounds().pad(-FOLLOW_EDGE_INSET).contains([p.lat, p.lon])) return;
    map.panTo([p.lat, p.lon], { animate: true });
  }

  private vesselIconKey(
    geom: VesselGeometry,
    headingDeg: number,
    isStale: boolean,
    isOwn: boolean,
  ): string {
    return [
      Math.round(headingDeg),
      geom.lengthPx,
      geom.beamPx,
      geom.alongFrac.toFixed(3),
      geom.acrossFrac.toFixed(3),
      isStale ? 1 : 0,
      isOwn ? 1 : 0,
    ].join('|');
  }

  /**
   * Hover is hit-tested against the pointer rather than the marker DOM: Leaflet
   * replaces the icon element whenever heading changes, which fires mouseout
   * with no matching mouseover under a still pointer, and the icon rectangle
   * does not follow the rotated hull.
   */
  /** Always-on name labels, used where there is no pointer to hover with. */
  private syncPinnedLabel(
    marker: {
      bindTooltip: Function;
      unbindTooltip?: Function;
      getTooltip?: Function;
    },
    label: string,
  ): void {
    const existing = marker.getTooltip?.();
    if (!this.showLabels) {
      if (existing) marker.unbindTooltip?.();
      return;
    }
    if (existing) {
      if (existing.getContent() !== label) existing.setContent(label);
      return;
    }
    marker.bindTooltip(label, {
      permanent: true,
      direction: 'top',
      offset: [0, -8],
      opacity: 0.9,
      className: 'vessel-name-tooltip',
      interactive: false,
    });
  }

  private updateHoverFromPointer(point: { x: number; y: number }): void {
    if (!this.map || this.showLabels) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = this.map as any;

    let nearest: string | null = null;
    let nearestDist = Infinity;
    for (const [mmsi, marker] of this.markers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = map.latLngToContainerPoint((marker as any).getLatLng());
      const off = this.hoverOffsets.get(mmsi);
      const dist = Math.hypot(p.x + (off?.x ?? 0) - point.x, p.y + (off?.y ?? 0) - point.y);
      const radius = this.hoverRadii.get(mmsi) ?? VESSEL_HIT_MIN_RADIUS_PX;
      if (dist <= radius && dist < nearestDist) {
        nearest = mmsi;
        nearestDist = dist;
      }
    }

    if (!nearest) {
      if (this.hoveredMmsi) this.closeAllTooltips();
      return;
    }
    if (nearest === this.hoveredMmsi && this.hoverTip && map.hasLayer(this.hoverTip)) return;
    this.hoveredMmsi = nearest;
    this.showHoverTipFor(nearest);
  }

  private showHoverTipFor(mmsi: string): void {
    if (!this.map) return;
    const marker = this.markers.get(mmsi) as { getLatLng: Function } | undefined;
    const label = this.hoverLabels.get(mmsi);
    if (!marker || !label) return;
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
    this.hoverRadii.clear();
    this.hoverOffsets.clear();
  }
}

/** AIS names are often ALL CAPS — show as Heading Case in the UI. */
function toHeadingCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b([a-z])/g, ch => ch.toUpperCase());
}

function lastPosition(v: Vessel | undefined): LatLon | null {
  if (!v?.positions?.length) return null;
  const p = v.positions[v.positions.length - 1];
  return { lat: p.lat, lon: p.lon };
}

function distanceFrom(origin: LatLon | null, v: Vessel): number | null {
  const pos = lastPosition(v);
  if (!origin || !pos) return null;
  return haversineDistance(origin, pos);
}
