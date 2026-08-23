/**
 * NotificationBridgeService
 *
 * Subscribes to the Signal-K delta stream and forwards alarm-level
 * notifications to the device via Capacitor's LocalNotifications API.
 *
 * Signal-K notification paths follow the pattern:
 *   notifications.<domain>.<subject>
 * Each value has the shape:
 *   { state: 'nominal'|'normal'|'alert'|'warn'|'alarm'|'emergency', message: string }
 *
 * Only 'alarm' and 'emergency' states fire a device notification.
 * 'alert' and 'warn' are available but suppressed by default (user-configurable
 * in the Settings page in a future iteration).
 *
 * The service uses lazy-loaded Capacitor to avoid breaking the web PWA build
 * (Capacitor APIs are no-ops in the browser and must be imported dynamically
 * to avoid tree-shaking errors when the Capacitor plugin is not available).
 *
 * Must be initialised by calling start() — typically from AppModule or a root
 * component — after the Signal-K service is ready.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SignalKService, SignalKDelta } from './signal-k.service';

export type NotificationSeverity = 'nominal' | 'normal' | 'alert' | 'warn' | 'alarm' | 'emergency';

const NOTIFIED_STATES: NotificationSeverity[] = ['alarm', 'emergency'];
const NOTIFICATION_COOLDOWN_MS = 60_000; // suppress repeat notifications per path for 1 minute

interface SkNotificationValue {
  state?: NotificationSeverity;
  message?: string;
  method?: string[];
}

@Injectable({ providedIn: 'root' })
export class NotificationBridgeService implements OnDestroy {

  private sub: Subscription | null = null;
  private notifiedAt = new Map<string, number>(); // path → timestamp of last notification
  private nextId = 1_000; // Capacitor notification IDs

  constructor(private readonly sk: SignalKService) {}

  /** Begin listening. Safe to call multiple times — stops the previous listener first. */
  start(): void {
    this.stop();
    this.sub = this.sk.delta$.pipe(
      filter(delta => !!delta.updates?.length),
    ).subscribe(delta => this.handleDelta(delta));
  }

  /**
   * Fire a local/device notification from app logic (e.g. anchorage conflict).
   * Uses the same Capacitor / browser path as Signal-K alarms, with cooldown per key.
   */
  notifyAppEvent(key: string, title: string, body: string): void {
    const now = Date.now();
    const lastFired = this.notifiedAt.get(key) ?? 0;
    if (now - lastFired < NOTIFICATION_COOLDOWN_MS) return;
    this.notifiedAt.set(key, now);
    void this.fireNotification(key, { state: 'alarm', message: body }, title);
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // ---------------------------------------------------------------------------

  private handleDelta(delta: SignalKDelta): void {
    for (const update of delta.updates) {
      for (const kv of update.values) {
        if (!kv.path.startsWith('notifications.')) continue;
        const value = kv.value as SkNotificationValue | null;
        if (!value || !value.state) continue;
        if (!NOTIFIED_STATES.includes(value.state)) continue;

        const path = kv.path;
        const now = Date.now();
        const lastFired = this.notifiedAt.get(path) ?? 0;
        if (now - lastFired < NOTIFICATION_COOLDOWN_MS) continue;

        this.notifiedAt.set(path, now);
        void this.fireNotification(path, value);
      }
    }
  }

  private async fireNotification(
    path: string,
    value: SkNotificationValue,
    titleOverride?: string,
  ): Promise<void> {
    const title = titleOverride ?? this.titleForPath(path, value.state ?? 'alarm');
    const body  = value.message ?? `Signal-K notification on ${path}`;
    const id    = this.nextId++;

    try {
      // Dynamic import keeps the web PWA build clean when the Capacitor plugin
      // is not installed; in a native Capacitor build this resolves normally.
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [{ id, title, body, sound: 'default' }],
      });
    } catch {
      // Capacitor not available (browser PWA) — fall back to the Web Notifications API.
      this.fireBrowserNotification(title, body);
    }
  }

  private fireBrowserNotification(title: string, body: string): void {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      void Notification.requestPermission().then(perm => {
        if (perm === 'granted') new Notification(title, { body });
      });
    }
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
