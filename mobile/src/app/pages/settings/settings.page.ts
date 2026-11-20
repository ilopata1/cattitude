import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  FuelCurveFields,
  fuelCurveError,
  fuelCurveFromText,
  fuelCurveIdleNote,
  fuelCurveSummary,
} from '../../core/fuel/fuel-range';
import { formatHousePercent, houseBatteryPercentFromText } from '../../core/levels/house-battery';
import { isSailingVessel } from '../../core/guide/more-menu';
import { CoachInputHealth, formatCoachInputLine } from '../../core/coach/coach-inputs';
import { CoachInputsService } from '../../core/services/coach-inputs.service';
import { ContentService } from '../../core/services/content.service';
import { FuelCurveSettingsService } from '../../core/services/fuel-curve-settings.service';
import { HouseBatterySettingsService } from '../../core/services/house-battery-settings.service';
import {
  DeviceNotificationPermission,
  NotificationBridgeService,
} from '../../core/services/notification-bridge.service';
import { NotificationPreferenceService } from '../../core/services/notification-preference.service';
import { SignalKService, SignalKConnectionState } from '../../core/services/signal-k.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { WaveSettingsService } from '../../core/services/wave-settings.service';
import {
  HullType,
  WAVE_PRESETS,
  WaveSettingsFields,
  hullTypeForVessel,
  waveSettingsFromFields,
} from '../../core/waves/wave-settings';

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
  housePercentControl = new FormControl('30');
  waveOpen = false;
  hullType: HullType = 'mono';
  waveError = '';
  coachHealth: CoachInputHealth[] = [];
  readonly formatCoachHealth = formatCoachInputLine;
  lWlControl = new FormControl('');
  bRollControl = new FormControl('');
  tRollControl = new FormControl('');
  tPitchControl = new FormControl('');
  antennaXControl = new FormControl('');
  antennaYControl = new FormControl('');
  antennaZControl = new FormControl('');
  rollGainControl = new FormControl('');

  private subs: Subscription[] = [];

  constructor(
    private readonly sk: SignalKService,
    private readonly skSettings: SignalKSettingsService,
    private readonly fuelCurve: FuelCurveSettingsService,
    private readonly houseBattery: HouseBatterySettingsService,
    private readonly waveSettings: WaveSettingsService,
    private readonly content: ContentService,
    private readonly route: ActivatedRoute,
    private readonly notificationPrefs: NotificationPreferenceService,
    private readonly notifications: NotificationBridgeService,
    private readonly coachInputs: CoachInputsService,
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
    this.loadWaves();
    this.housePercentControl.setValue(formatHousePercent(this.houseBattery.percent));
    this.subs.push(this.route.queryParamMap.subscribe((params) => {
      if (params.get('section') === 'waves') this.waveOpen = true;
    }));

    this.subs.push(
      this.sk.state$.subscribe(state => {
        this.connectionState = state;
        if (state !== 'error') this.lastError = '';
      }),
      this.sk.self$.subscribe(self => { this.selfContext = self; }),
      this.sk.error$.subscribe(err => { this.lastError = err; }),
      this.coachInputs.health$.subscribe(rows => { this.coachHealth = rows; }),
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
    this.saveHousePercent();
    this.saveWaves();
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

  housePercentError(): string {
    return houseBatteryPercentFromText(text(this.housePercentControl.value)).error;
  }

  saveHousePercent(): void {
    const parsed = houseBatteryPercentFromText(text(this.housePercentControl.value));
    if (parsed.error) return;
    this.houseBattery.save(parsed.percent);
    this.housePercentControl.setValue(formatHousePercent(parsed.percent));
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

  toggleWaves(): void {
    this.waveOpen = !this.waveOpen;
  }

  onHull(value: string | undefined): void {
    if ((value !== 'mono' && value !== 'cat') || value === this.hullType) return;
    const previous = WAVE_PRESETS[this.hullType];
    const next = WAVE_PRESETS[value];
    this.hullType = value;
    this.swapAntennaDefault(this.antennaYControl, previous.antennaY, next.antennaY);
    this.swapAntennaDefault(this.antennaZControl, previous.antennaZ, next.antennaZ);
    this.saveWaves();
  }

  rollWidthLabel(): string {
    return this.hullType === 'cat' ? 'Distance between hull centrelines (m)' : 'Waterline beam (m)';
  }

  wavePresetHint(): string {
    const preset = WAVE_PRESETS[this.hullType];
    return `Leave a period blank to start from ${preset.tRollNatural} s of roll and ${preset.tPitchNatural} s of pitch. Measure them from a wake when you can.`;
  }

  saveWaves(): void {
    const parsed = waveSettingsFromFields(this.waveFields());
    this.waveError = parsed.error;
    if (!parsed.settings) return;
    this.waveSettings.save(parsed.settings);
  }

  private waveFields(): WaveSettingsFields {
    return {
      hullType: this.hullType,
      lWl: text(this.lWlControl.value),
      bRoll: text(this.bRollControl.value),
      tRoll: text(this.tRollControl.value),
      tPitch: text(this.tPitchControl.value),
      antennaX: text(this.antennaXControl.value),
      antennaY: text(this.antennaYControl.value),
      antennaZ: text(this.antennaZControl.value),
      rollGain: text(this.rollGainControl.value),
    };
  }

  private loadWaves(): void {
    const saved = this.waveSettings.current;
    this.hullType = saved.hullType ?? hullTypeForVessel(this.content.bootstrap.branding.vesselType);
    this.lWlControl.setValue(saved.lWl == null ? '' : String(saved.lWl));
    this.bRollControl.setValue(saved.bRoll == null ? '' : String(saved.bRoll));
    this.tRollControl.setValue(saved.tRollNatural == null ? '' : String(saved.tRollNatural));
    this.tPitchControl.setValue(saved.tPitchNatural == null ? '' : String(saved.tPitchNatural));
    const preset = WAVE_PRESETS[this.hullType];
    this.antennaXControl.setValue(saved.antennaX ? String(saved.antennaX) : '');
    this.antennaYControl.setValue(this.antennaDefaultText(saved.antennaY, preset.antennaY));
    this.antennaZControl.setValue(this.antennaDefaultText(saved.antennaZ, preset.antennaZ));
    this.rollGainControl.setValue(saved.rollGain == null ? '' : String(saved.rollGain));
  }

  private antennaDefaultText(value: number | null, preset: number): string {
    if (value == null) return preset ? String(preset) : '';
    return String(value);
  }

  private swapAntennaDefault(control: FormControl, from: number, to: number): void {
    const current = text(control.value).trim();
    const fromText = from ? String(from) : '';
    if (current !== fromText) return;
    control.setValue(to ? String(to) : '');
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
