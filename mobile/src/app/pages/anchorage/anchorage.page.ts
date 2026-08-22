import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AnchorageVesselStoreService } from './core/services/anchorage-vessel-store.service';
import { AnchorageSettingsService } from './core/services/anchorage-settings.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { Vessel, VesselState } from './core/models/vessel.model';

// Leaflet is loaded dynamically to keep the bundle clean and avoid SSR issues.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let L: any;

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const STATE_COLOUR: Record<VesselState, string> = {
  green:   '#4caf50',
  amber:   '#ff9800',
  red:     '#f44336',
  moving:  '#2196f3',
  unknown: '#9e9e9e',
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
  isRecording = false;
  skConnected = false;

  ownMmsiControl = new FormControl('');

  private map: unknown = null;
  private markers = new Map<string, unknown>();   // mmsi → L.CircleMarker
  private circles = new Map<string, unknown>();   // mmsi → L.Circle
  private subs: Subscription[] = [];
  private leafletReady = false;
  /** Set after the first successful center on own vessel. */
  private hasCenteredOnOwn = false;
  /** User panned or zoomed — suppress automatic re-centering. */
  private userAdjustedMap = false;

  constructor(
    private readonly vesselStore: AnchorageVesselStoreService,
    private readonly anchorSettings: AnchorageSettingsService,
    private readonly sk: SignalKService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.ownMmsiControl.setValue(this.anchorSettings.get().ownMmsi);

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
        this.updateMap();
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
    // Leaflet mis-sizes when the tab was hidden; refresh then center if needed.
    requestAnimationFrame(() => {
      if (!this.map) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).invalidateSize();
      this.centerOnOwnVessel(false);
    });
  }

  // ---------------------------------------------------------------------------
  // User actions

  recenterOnBoat(): void {
    this.userAdjustedMap = false;
    this.centerOnOwnVessel(true);
  }

  startRecording(): void {
    this.vesselStore.startRecording();
    this.isRecording = true;
    this.cdr.markForCheck();
  }

  stopRecording(): void {
    this.vesselStore.stopRecording();
    this.vesselStore.stop();
    this.isRecording = false;
    this.cdr.markForCheck();
  }

  saveOwnMmsi(): void {
    this.anchorSettings.update({ ownMmsi: this.ownMmsiControl.value ?? '' });
  }

  clearAll(): void {
    this.stopRecording();
    this.vesselStore.clear();
    this.clearMapLayers();
  }

  // ---------------------------------------------------------------------------
  // Helpers

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

    // Inject CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // Inject JS
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
      zoomControl: true,
    });
    this.map = map;

    map.on('dragstart', () => { this.userAdjustedMap = true; });
    map.on('zoomstart', (e: { originalEvent?: Event }) => {
      if (e.originalEvent) this.userAdjustedMap = true;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L as any).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
  }

  private updateMap(): void {
    if (!this.leafletReady || !this.map) return;

    const seenMmsis = new Set<string>();

    for (const vessel of this.vessels) {
      const last = vessel.positions[vessel.positions.length - 1];
      if (!last) continue;

      seenMmsis.add(vessel.mmsi);
      const colour = STATE_COLOUR[vessel.state];

      // Update or create vessel marker.
      if (this.markers.has(vessel.mmsi)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.markers.get(vessel.mmsi) as any).setLatLng([last.lat, last.lon]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.markers.get(vessel.mmsi) as any).setStyle({ color: colour, fillColor: colour });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = (L as any).circleMarker([last.lat, last.lon], {
          radius: vessel.isOwn ? 10 : 6,
          color: colour, fillColor: colour, fillOpacity: 0.8, weight: 2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).bindTooltip(vessel.name).addTo(this.map as any);
        this.markers.set(vessel.mmsi, marker);
      }

      // Update or create swing-circle.
      if (vessel.anchorPoint && vessel.swingRadius > 0) {
        if (this.circles.has(vessel.mmsi)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.circles.get(vessel.mmsi) as any).setLatLng([vessel.anchorPoint.lat, vessel.anchorPoint.lon]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.circles.get(vessel.mmsi) as any).setRadius(vessel.swingRadius);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this.circles.get(vessel.mmsi) as any).setStyle({ color: colour });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const circle = (L as any).circle(
            [vessel.anchorPoint.lat, vessel.anchorPoint.lon],
            { radius: vessel.swingRadius, color: colour, fill: false, weight: 1.5, dashArray: '4 4' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ).addTo(this.map as any);
          this.circles.set(vessel.mmsi, circle);
        }
      } else if (this.circles.has(vessel.mmsi)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.map as any).removeLayer(this.circles.get(vessel.mmsi) as any);
        this.circles.delete(vessel.mmsi);
      }
    }

    // Remove stale map layers for vessels that have been evicted.
    for (const [mmsi, marker] of this.markers) {
      if (!seenMmsis.has(mmsi)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.map as any).removeLayer(marker as any);
        this.markers.delete(mmsi);
      }
    }
    for (const [mmsi, circle] of this.circles) {
      if (!seenMmsis.has(mmsi)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.map as any).removeLayer(circle as any);
        this.circles.delete(mmsi);
      }
    }

    this.centerOnOwnVessel(false);
  }

  /** Center on own vessel once on open, or when the user taps Recenter. */
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

  private clearMapLayers(): void {
    if (!this.map) return;
    for (const m of this.markers.values()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).removeLayer(m as any);
    }
    for (const c of this.circles.values()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.map as any).removeLayer(c as any);
    }
    this.markers.clear();
    this.circles.clear();
  }
}
