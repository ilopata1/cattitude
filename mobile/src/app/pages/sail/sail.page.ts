import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { isSailingVessel } from '../../core/guide/more-menu';
import { ContentService } from '../../core/services/content.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { InstrumentMapService } from '../../core/services/instrument-map.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

/**
 * SailPage — native instruments using Skip wind-steer visuals (MIT) and
 * vessel-specific Signal-K path mappings from the Cattitude backend.
 */
@Component({
  selector: 'app-sail',
  templateUrl: './sail.page.html',
  styleUrls: ['./sail.page.scss'],
  host: { class: 'helm-screen' },
  standalone: false,
})
export class SailPage implements OnInit, OnDestroy {

  hasSignalKUrl = false;
  private wakeLock: WakeLockSentinel | null = null;
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      void this.acquireWakeLock();
    }
  };

  constructor(
    private readonly skSettings: SignalKSettingsService,
    private readonly instrumentMaps: InstrumentMapService,
    private readonly content: ContentService,
    private readonly router: Router,
    readonly routes: VesselRouteService,
  ) {}

  get openedFromMore(): boolean {
    return this.router.url.includes('/more/sail');
  }

  get pageTitle(): string {
    return isSailingVessel(this.content.bootstrap.branding.vesselType) ? 'Sail' : 'Instruments';
  }

  ngOnInit(): void {
    this.skSettings.url$.subscribe(url => {
      this.hasSignalKUrl = !!url;
    });
    void this.instrumentMaps.ensureLoaded();
  }

  ionViewDidEnter(): void {
    document.addEventListener('visibilitychange', this.onVisibility);
    void this.acquireWakeLock();
  }

  ionViewWillLeave(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.releaseWakeLock();
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.releaseWakeLock();
  }

  private async acquireWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator) || this.wakeLock) {
      return;
    }
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch {
      this.wakeLock = null;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const lock = this.wakeLock;
    this.wakeLock = null;
    try {
      await lock?.release();
    } catch {
      /* already released when the tab hides */
    }
  }
}
