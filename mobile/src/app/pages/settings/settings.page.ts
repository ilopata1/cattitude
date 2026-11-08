import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  FuelCurveFields,
  fuelCurveError,
  fuelCurveFromText,
  fuelCurveIdleNote,
  fuelCurveSummary,
} from '../../core/fuel/fuel-range';
import { isSailingVessel } from '../../core/guide/more-menu';
import { ContentService } from '../../core/services/content.service';
import { FuelCurveSettingsService } from '../../core/services/fuel-curve-settings.service';
import {
  DeviceNotificationPermission,
  NotificationBridgeService,
} from '../../core/services/notification-bridge.service';
import { NotificationPreferenceService } from '../../core/services/notification-preference.service';
import { SignalKService, SignalKConnectionState } from '../../core/services/signal-k.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {

  urlControl = new FormControl('', [Validators.pattern(/^(https?|wss?):\/\/.+|[a-zA-Z0-9.-]+(:\d+)?$/)]);
  tokenControl = new FormControl('');

  connectionState: SignalKConnectionState = 'disconnected';
  selfContext = '';
  lastError = '';
  alertsEnabled = true;
  devicePermission: DeviceNotificationPermission = 'prompt';
  maxRpmControl = new FormControl('');
  maxFuelControl = new FormControl('');
  cruiseFuelControl = new FormControl('');
  engineCountControl = new FormControl('');
  idleFuelControl = new FormControl('');

  private subs: Subscription[] = [];

  constructor(
    private readonly sk: SignalKService,
    private readonly skSettings: SignalKSettingsService,
    private readonly fuelCurve: FuelCurveSettingsService,
    private readonly content: ContentService,
    private readonly notificationPrefs: NotificationPreferenceService,
    private readonly notifications: NotificationBridgeService,
    readonly theme: ThemeService,
  ) {
    this.alertsEnabled = this.notificationPrefs.enabled();
  }

  get sailing(): boolean {
    return isSailingVessel(this.content.bootstrap.branding.vesselType);
  }

  ngOnInit(): void {
    this.urlControl.setValue(this.skSettings.url);
    this.tokenControl.setValue(this.skSettings.token ?? '');
    this.loadFuelCurve();

    this.subs.push(
      this.sk.state$.subscribe(state => {
        this.connectionState = state;
        if (state !== 'error') this.lastError = '';
      }),
      this.sk.self$.subscribe(self => { this.selfContext = self; }),
      this.sk.error$.subscribe(err => { this.lastError = err; }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get saveDisabled(): boolean {
    return this.urlControl.invalid || !this.urlControl.value;
  }

  get urlError(): string {
    const value = (this.urlControl.value ?? '').trim();
    if (!value) {
      return 'Enter this boat’s Signal K address to connect.';
    }
    if (this.urlControl.invalid) {
      return 'Use an address like https://signalk.example or boat.local:3000.';
    }
    return '';
  }

  get stateLabel(): string {
    switch (this.connectionState) {
      case 'connected':    return 'Connected';
      case 'connecting':   return 'Connecting…';
      case 'error':        return 'Error';
      case 'disconnected': return 'Disconnected';
    }
  }

  get stateColor(): string {
    switch (this.connectionState) {
      case 'connected':    return 'success';
      case 'connecting':   return 'warning';
      case 'error':        return 'danger';
      case 'disconnected': return 'dark';
    }
  }

  saveAndConnect(): void {
    if (this.urlControl.invalid) return;
    const url = (this.urlControl.value ?? '').trim();
    this.skSettings.setUrl(url);
    this.skSettings.setToken(this.tokenControl.value ?? '');
    if (url) {
      this.sk.connect();
    } else {
      this.sk.disconnect();
    }
  }

  disconnect(): void {
    this.sk.disconnect();
  }

  ionViewWillLeave(): void {
    this.saveFuelCurve();
  }

  ionViewWillEnter(): void {
    this.alertsEnabled = this.notificationPrefs.enabled();
    void this.notifications.refreshDevicePermission().then(permission => {
      this.devicePermission = permission;
    });
  }

  onThemeChange(value: string | undefined): void {
    if (value !== 'system' && value !== 'light' && value !== 'dark' && value !== 'night') {
      return;
    }
    const preference: ThemePreference = value;
    if (preference === this.theme.preference()) {
      return;
    }
    this.theme.setPreference(preference);
  }

  onAlertsToggle(on: boolean): void {
    if (on === this.alertsEnabled) {
      return;
    }
    this.alertsEnabled = on;
    this.notificationPrefs.setEnabled(on);
  }

  allowDeviceNotifications(): void {
    void this.notifications.allowFromUserGesture().then(permission => {
      this.devicePermission = permission;
    });
  }

  fuelFields(): FuelCurveFields {
    return {
      maxRpm: text(this.maxRpmControl.value),
      maxFuelLph: text(this.maxFuelControl.value),
      cruiseFuelLph: text(this.cruiseFuelControl.value),
      engineCount: text(this.engineCountControl.value),
      idleFuelLph: text(this.idleFuelControl.value),
    };
  }

  fuelSummary(): string {
    return fuelCurveSummary(fuelCurveFromText(this.fuelFields()));
  }

  fuelError(): string {
    return fuelCurveError(this.fuelFields());
  }

  fuelIdleNote(): string {
    return fuelCurveIdleNote(fuelCurveFromText(this.fuelFields()));
  }

  saveFuelCurve(): void {
    this.fuelCurve.save(fuelCurveFromText(this.fuelFields()));
  }

  get devicePermissionHint(): string {
    switch (this.devicePermission) {
      case 'granted':
        return 'Device notifications are allowed, including when the app is in the background.';
      case 'denied':
        return 'Device notifications are blocked. Allow them for this site in the browser or system settings. Alerts still show in the app.';
      case 'unsupported':
        return 'This browser cannot show device notifications. Alerts still show in the app.';
      default:
        return 'Allow device notifications to hear alerts when the app is in the background. The browser only asks from the button below.';
    }
  }

  private loadFuelCurve(): void {
    const curve = this.fuelCurve.current;
    this.maxRpmControl.setValue(curve.maxRpm == null ? '' : String(curve.maxRpm));
    this.maxFuelControl.setValue(curve.maxFuelLph == null ? '' : String(curve.maxFuelLph));
    this.cruiseFuelControl.setValue(curve.cruiseFuelLph == null ? '' : String(curve.cruiseFuelLph));
    this.engineCountControl.setValue(curve.engineCount == null ? '' : String(curve.engineCount));
    this.idleFuelControl.setValue(curve.idleFuelLph == null ? '' : String(curve.idleFuelLph));
  }
}

function text(value: string | number | null | undefined): string {
  return value == null ? '' : String(value);
}
