import { Component, inject } from '@angular/core';
import { AppUpdateService } from './core/services/app-update.service';
import { NotificationBridgeService } from './core/services/notification-bridge.service';
import { SailWatchService } from './core/services/sail-watch.service';

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

  constructor() {
    this.notificationBridge.start();
    this.sailWatch.ensureRunning();
    this.appUpdate.start();
  }
}
