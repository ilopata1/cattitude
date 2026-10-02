import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MoreRow, moreMenu } from '../../core/guide/more-menu';
import { ContentService } from '../../core/services/content.service';
import { SignalKService, SignalKConnectionState } from '../../core/services/signal-k.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: false,
})
export class MorePage {
  private configured = false;
  private connection: SignalKConnectionState = 'disconnected';

  constructor(
    public readonly content: ContentService,
    private readonly routes: VesselRouteService,
    settings: SignalKSettingsService,
    signalK: SignalKService,
  ) {
    const destroyRef = inject(DestroyRef);
    settings.url$.pipe(takeUntilDestroyed(destroyRef)).subscribe((url) => {
      this.configured = !!url.trim();
    });
    signalK.state$.pipe(takeUntilDestroyed(destroyRef)).subscribe((state) => {
      this.connection = state;
    });
  }

  get rows(): MoreRow[] {
    return moreMenu(this.content.bootstrap.branding.vesselType);
  }

  open(row: MoreRow): void {
    void this.routes.navigateTabs('more', ...row.route);
  }

  liveStatus(row: MoreRow): string {
    if (row.id !== 'sail' && row.id !== 'polar' && row.id !== 'anchorage') {
      return '';
    }
    if (!this.configured) {
      return 'Signal K not set';
    }
    switch (this.connection) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'No live data';
      default:
        return 'Offline';
    }
  }
}
