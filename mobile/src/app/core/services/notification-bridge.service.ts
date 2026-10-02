/**
 * NotificationBridgeService
 *
 * Subscribes to the Signal-K delta stream and forwards alarm-level
 * notifications. Sail-plan mismatches and anchorage conflicts use the same path.
 *
 * Signal-K notification paths follow the pattern:
 *   notifications.<domain>.<subject>
 * Each value has the shape:
 *   { state: 'nominal'|'normal'|'alert'|'warn'|'alarm'|'emergency', message: string }
 *
 * Only 'alarm' and 'emergency' states fire. 'alert' and 'warn' stay suppressed.
 *
 * The alerts preference defaults to on and only controls delivery. The browser
 * or OS permission prompt is requested from Settings, in the tap handler.
 * Alarm delivery never calls requestPermission: granted posts a device
 * notification, and anything else shows an in-app notice.
 *
 * Capacitor is imported dynamically so the web build still runs when the
 * native plugin cannot be loaded.
 *
 * Must be initialised by calling start() — typically from the root component —
 * after the Signal-K service is ready.
 */
import { Injectable, OnDestroy, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  DeviceNotificationPermission,
  fromDevicePermission,
  readWebNotificationPermission,
  requestWebNotificationPermission,
  WebNotificationPermissionSource,
} from './notification-permission';
import { NotificationPreferenceService } from './notification-preference.service';
import { SignalKService, SignalKDelta } from './signal-k.service';

export type { DeviceNotificationPermission } from './notification-permission';
export type NotificationSeverity = 'nominal' | 'normal' | 'alert' | 'warn' | 'alarm' | 'emergency';

const NOTIFIED_STATES: NotificationSeverity[] = ['alarm', 'emergency'];
const NOTIFICATION_COOLDOWN_MS = 60_000;

interface SkNotificationValue {
  state?: NotificationSeverity;
  message?: string;
  method?: string[];
}

interface DeviceNotifications {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: {
    notifications: { id: number; title: string; body: string; sound?: string }[];
  }): Promise<unknown>;
}

@Injectable({ providedIn: 'root' })
export class NotificationBridgeService implements OnDestroy {

  private sub: Subscription | null = null;
  private notifiedAt = new Map<string, number>();
  private nextId = 1_000;
  private localNotifications: DeviceNotifications | null = null;
  private native = false;
  private readonly localReady: Promise<void>;
  private readonly devicePermissionSignal = signal<DeviceNotificationPermission>('prompt');
  readonly devicePermission = this.devicePermissionSignal.asReadonly();

  constructor(
    private readonly sk: SignalKService,
    private readonly preferences: NotificationPreferenceService,
    private readonly toasts: ToastController,
  ) {
    this.localReady = this.preload();
  }

  /** Begin listening. Safe to call multiple times — stops the previous listener first. */
  start(): void {
    this.stop();
    this.sub = this.sk.delta$.pipe(
      filter(delta => !!delta.updates?.length),
    ).subscribe(delta => this.handleDelta(delta));
  }

  /**
   * Fire a local/device notification from app logic (e.g. anchorage conflict).
   * Uses the same delivery path as Signal-K alarms, with cooldown per key.
   */
  notifyAppEvent(key: string, title: string, body: string): void {
    if (!this.preferences.enabled()) {
      return;
    }
    if (this.coolingDown(key)) {
      return;
    }
    this.notifiedAt.set(key, Date.now());
    void this.fireNotification(key, { state: 'alarm', message: body }, title);
  }

  /** Read the current device permission. Does not show a prompt. */
  refreshDevicePermission(): Promise<DeviceNotificationPermission> {
    return this.readDevicePermission().then(permission => {
      this.devicePermissionSignal.set(permission);
      return permission;
    });
  }

  /**
   * Ask for device notification permission. Call this directly from a tap handler
   * so the browser still has a user gesture.
   */
  allowFromUserGesture(): Promise<DeviceNotificationPermission> {
    if (this.native && this.localNotifications) {
      return this.publish(this.fromRequest(this.localNotifications.requestPermissions()));
    }
    if (this.native) {
      return this.publish(this.localReady.then(() => {
        if (!this.localNotifications) {
          return 'unsupported' as const;
        }
        return this.fromRequest(this.localNotifications.requestPermissions());
      }));
    }
    return this.publish(requestWebNotificationPermission(this.webNotification()));
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // ---------------------------------------------------------------------------

  private preload(): Promise<void> {
    return Promise.all([
      import('@capacitor/core'),
      import('@capacitor/local-notifications'),
    ]).then(([core, plugin]) => {
      this.native = core.Capacitor.isNativePlatform();
      this.localNotifications = plugin.LocalNotifications;
    }).catch(() => {
      this.native = false;
      this.localNotifications = null;
    });
  }

  private handleDelta(delta: SignalKDelta): void {
    if (!this.preferences.enabled()) {
      return;
    }
    for (const update of delta.updates) {
      for (const kv of update.values) {
        if (!kv.path.startsWith('notifications.')) continue;
        const value = kv.value as SkNotificationValue | null;
        if (!value || !value.state) continue;
        if (!NOTIFIED_STATES.includes(value.state)) continue;

        const path = kv.path;
        if (this.coolingDown(path)) continue;

        this.notifiedAt.set(path, Date.now());
        void this.fireNotification(path, value);
      }
    }
  }

  private coolingDown(key: string): boolean {
    const lastFired = this.notifiedAt.get(key) ?? 0;
    return Date.now() - lastFired < NOTIFICATION_COOLDOWN_MS;
  }

  private async fireNotification(
    path: string,
    value: SkNotificationValue,
    titleOverride?: string,
  ): Promise<void> {
    if (!this.preferences.enabled()) {
      return;
    }
    const title = titleOverride ?? this.titleForPath(path, value.state ?? 'alarm');
    const body  = value.message ?? `Signal-K notification on ${path}`;
    const permission = await this.readDevicePermission();
    this.devicePermissionSignal.set(permission);
    if (permission === 'granted') {
      await this.scheduleDeviceNotification(this.nextId++, title, body);
      return;
    }
    await this.showInApp(title, body);
  }

  private async readDevicePermission(): Promise<DeviceNotificationPermission> {
    const local = this.localNotifications;
    if (local) {
      try {
        const perm = await local.checkPermissions();
        return fromDevicePermission(perm.display);
      } catch {
        return readWebNotificationPermission(this.webNotification());
      }
    }
    return readWebNotificationPermission(this.webNotification());
  }

  private fromRequest(
    pending: Promise<{ display: string }>,
  ): Promise<DeviceNotificationPermission> {
    return pending
      .then(result => fromDevicePermission(result.display))
      .catch(() => readWebNotificationPermission(this.webNotification()));
  }

  private publish(
    pending: Promise<DeviceNotificationPermission>,
  ): Promise<DeviceNotificationPermission> {
    return pending.then(permission => {
      this.devicePermissionSignal.set(permission);
      return permission;
    });
  }

  private async scheduleDeviceNotification(id: number, title: string, body: string): Promise<void> {
    const local = this.localNotifications;
    if (!local) {
      await this.showInApp(title, body);
      return;
    }
    try {
      await local.schedule({
        notifications: [{ id, title, body, sound: 'default' }],
      });
    } catch {
      await this.showInApp(title, body);
    }
  }

  private async showInApp(title: string, body: string): Promise<void> {
    try {
      const toast = await this.toasts.create({
        header: title,
        message: body,
        duration: 6000,
        position: 'top',
        color: 'warning',
      });
      await toast.present();
    } catch (error) {
      console.warn('Could not show the in-app alert.', error);
    }
  }

  private webNotification(): WebNotificationPermissionSource | undefined {
    if (typeof Notification === 'undefined') {
      return undefined;
    }
    return Notification;
  }

  private titleForPath(path: string, state: NotificationSeverity): string {
    const subject = path
      .replace('notifications.', '')
      .replace(/\./g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    const label = state === 'emergency' ? '🚨 EMERGENCY' : '⚠️ ALARM';
    return `${label} — ${subject}`;
  }
}
