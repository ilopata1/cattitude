import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { AlarmBannerService, AlarmNotice } from './core/services/alarm-banner.service';
import { AppUpdateService } from './core/services/app-update.service';
import { EmergencyService } from './core/services/emergency.service';
import { NotificationBridgeService } from './core/services/notification-bridge.service';
import { SailWatchService } from './core/services/sail-watch.service';
import { ThemeService } from './core/services/theme.service';
import { VesselRouteService } from './core/services/vessel-route.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  readonly alarms = inject(AlarmBannerService);
  private readonly notificationBridge = inject(NotificationBridgeService);
  private readonly sailWatch = inject(SailWatchService);
  private readonly appUpdate = inject(AppUpdateService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly emergency = inject(EmergencyService);
  private readonly routes = inject(VesselRouteService);

  constructor() {
    this.theme.resolved();
    this.notificationBridge.start();
    this.sailWatch.ensureRunning();
    this.appUpdate.start();
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe(event => this.syncHelmRoute(event.urlAfterRedirects));
    this.syncHelmRoute(this.router.url);
    this.consumeShortcut();
  }

  openAlarm(notice: AlarmNotice): void {
    void this.routes.navigateTabs(...notice.route);
  }

  /** Home-screen shortcuts land on `/` before the vessel redirect. */
  private consumeShortcut(): void {
    let open = '';
    try {
      open = sessionStorage.getItem('cattitude.open') ?? '';
      sessionStorage.removeItem('cattitude.open');
    } catch {
      return;
    }
    if (open !== 'emergency') {
      return;
    }
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      take(1),
    ).subscribe(() => this.emergency.requestOpen());
  }

  /** Night red-shift covers the tab bar too, only while a helm screen is open. */
  private syncHelmRoute(url: string): void {
    const helm = /\/(sail|polar|anchorage)(?:\/|$|\?)/.test(url);
    document.documentElement.classList.toggle('helm-route', helm);
  }
}
