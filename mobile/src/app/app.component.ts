import { Component } from '@angular/core';
import { NotificationBridgeService } from './core/services/notification-bridge.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(notificationBridge: NotificationBridgeService) {
    notificationBridge.start();
  }
}
