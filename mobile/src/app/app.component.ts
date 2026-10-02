import { Component, inject } from '@angular/core';
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

  constructor() {
    this.notificationBridge.start();
    this.sailWatch.ensureRunning();
  }
}
