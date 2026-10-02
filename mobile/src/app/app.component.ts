import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AppUpdateService } from './core/services/app-update.service';
import { NotificationBridgeService } from './core/services/notification-bridge.service';
import { SailWatchService } from './core/services/sail-watch.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private readonly notificationBridge = inject(NotificationBridgeService);
  private readonly sailWatch = inject(SailWatchService);
  private readonly appUpdate = inject(AppUpdateService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  constructor() {
    this.theme.resolved();
    this.notificationBridge.start();
    this.sailWatch.ensureRunning();
    this.appUpdate.start();
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe(event => this.syncHelmRoute(event.urlAfterRedirects));
    this.syncHelmRoute(this.router.url);
  }

  /** Night red-shift covers the tab bar too, only while a helm screen is open. */
  private syncHelmRoute(url: string): void {
    const helm = /\/(sail|polar|anchorage)(?:\/|$|\?)/.test(url);
    document.documentElement.classList.toggle('helm-route', helm);
  }
}
