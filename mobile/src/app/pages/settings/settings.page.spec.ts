import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { FUEL_CURVE_STORAGE_KEY } from '../../core/services/fuel-curve-settings.service';
import { HOUSE_BATTERY_PERCENT_KEY } from '../../core/services/house-battery-settings.service';
import { ContentService } from '../../core/services/content.service';
import { NotificationBridgeService } from '../../core/services/notification-bridge.service';
import { NotificationPreferenceService } from '../../core/services/notification-preference.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage notifications', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let prefs: NotificationPreferenceService;
  let allowFromUserGesture: jasmine.Spy;

  beforeEach(async () => {
    localStorage.removeItem('cattitude.notifications.enabled');
    localStorage.removeItem(FUEL_CURVE_STORAGE_KEY);
    localStorage.removeItem(HOUSE_BATTERY_PERCENT_KEY);
    allowFromUserGesture = jasmine.createSpy('allowFromUserGesture').and.resolveTo('granted');

    await TestBed.configureTestingModule({
      declarations: [SettingsPage],
      imports: [IonicModule.forRoot(), ReactiveFormsModule, RouterModule.forRoot([])],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        NotificationPreferenceService,
        { provide: SignalKSettingsService, useValue: { url: '', token: '', setUrl: () => undefined, setToken: () => undefined } },
        {
          provide: SignalKService,
          useValue: {
            state$: new BehaviorSubject('disconnected'),
            self$: new BehaviorSubject(''),
            error$: new Subject<string>(),
            connect: () => undefined,
            disconnect: () => undefined,
          },
        },
        {
          provide: ContentService,
          useValue: { bootstrap: { branding: { vesselType: 'power' } } },
        },
        {
          provide: NotificationBridgeService,
          useValue: {
            refreshDevicePermission: () => Promise.resolve('prompt'),
            allowFromUserGesture,
          },
        },
      ],
    }).compileComponents();

    prefs = TestBed.inject(NotificationPreferenceService);
    fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
  });

  it('does not explain simulators, tunnels, or plugin repositories', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('generator.js');
    expect(text).not.toContain('signalk-sim');
    expect(text).not.toContain('Cloudflare');
    expect(text).not.toContain('hoeken');
    expect(text).not.toContain('Railway');
    expect(text).not.toContain('Skip');
  });

  it('offers the engine fuel curve', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fuel at 2,000 RPM');
    expect(text).toContain('Number of engines');
    expect(text).toContain('Idle fuel');
  });

  it('defaults the house battery alert to 30%', () => {
    expect(fixture.nativeElement.textContent).toContain('Alert below');
    expect(fixture.componentInstance.housePercentControl.value).toBe('30');
  });

  it('announces Signal K connection changes', () => {
    const status = fixture.nativeElement.querySelector('.connection-status') as HTMLElement;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('Disconnected');
  });

  it('defaults alerts on and asks for device permission only from the button', async () => {
    expect(prefs.enabled()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Allow device notifications');
    expect(allowFromUserGesture).not.toHaveBeenCalled();

    const button = Array.from(fixture.nativeElement.querySelectorAll('ion-button'))
      .find(element => (element as HTMLElement).textContent?.includes('Allow device notifications')) as HTMLElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(allowFromUserGesture).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.devicePermission).toBe('granted');
  });

  it('hides the browser prompt when alerts are turned off', () => {
    fixture.componentInstance.onAlertsToggle(false);
    fixture.detectChanges();

    expect(prefs.enabled()).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Allow device notifications');
  });
});
