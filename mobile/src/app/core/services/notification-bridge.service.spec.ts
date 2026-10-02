import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AlarmBannerService } from './alarm-banner.service';
import { DeviceNotificationPermission } from './notification-permission';
import { NotificationBridgeService } from './notification-bridge.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { SignalKService } from './signal-k.service';

interface BridgeTestAccess {
  readDevicePermission(): Promise<DeviceNotificationPermission>;
  scheduleDeviceNotification(id: number, title: string, body: string): Promise<void>;
  localReady: Promise<void>;
  native: boolean;
  localNotifications: {
    requestPermissions: jasmine.Spy;
    checkPermissions: jasmine.Spy;
    schedule: jasmine.Spy;
  } | null;
}

function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('NotificationBridgeService', () => {
  let service: NotificationBridgeService;
  let prefs: NotificationPreferenceService;
  let alarms: AlarmBannerService;
  let requestPermission: jasmine.Spy | null;

  beforeEach(() => {
    localStorage.removeItem('cattitude.notifications.enabled');
    requestPermission = typeof Notification === 'undefined'
      ? null
      : spyOn(Notification, 'requestPermission').and.resolveTo('granted');

    TestBed.configureTestingModule({
      providers: [
        NotificationBridgeService,
        NotificationPreferenceService,
        AlarmBannerService,
        { provide: SignalKService, useValue: { delta$: new Subject() } },
      ],
    });
    service = TestBed.inject(NotificationBridgeService);
    prefs = TestBed.inject(NotificationPreferenceService);
    alarms = TestBed.inject(AlarmBannerService);
    alarms.dismiss();
  });

  it('shows a persistent in-app banner without requesting device permission', async () => {
    spyOn(access(service), 'readDevicePermission').and.resolveTo('prompt');

    service.notifyAppEvent('sail-plan.mismatch', 'Sail plan', 'Reef the main');
    await flushPromises();
    await flushPromises();

    const banner = alarms.current();
    expect(banner?.title).toBe('Sail plan');
    expect(banner?.body).toBe('Reef the main');
    expect(banner?.actionLabel).toBe('Open Polar');
    if (requestPermission) {
      expect(requestPermission).not.toHaveBeenCalled();
    }
  });

  it('posts a device notification when permission is already granted', async () => {
    spyOn(access(service), 'readDevicePermission').and.resolveTo('granted');
    const schedule = spyOn(access(service), 'scheduleDeviceNotification').and.resolveTo();

    service.notifyAppEvent('anchorage.1', 'Anchorage collision risk', 'Two boats');
    await flushPromises();
    await flushPromises();

    expect(schedule).toHaveBeenCalled();
    expect(alarms.current()?.actionLabel).toBe('Open Anchorage');
    if (requestPermission) {
      expect(requestPermission).not.toHaveBeenCalled();
    }
  });

  it('stays quiet when alerts are off', async () => {
    prefs.setEnabled(false);

    service.notifyAppEvent('sail-plan.mismatch', 'Sail plan', 'Reef the main');
    await flushPromises();

    expect(alarms.current()).toBeNull();
    if (requestPermission) {
      expect(requestPermission).not.toHaveBeenCalled();
    }
  });

  it('asks the native plugin from the settings gesture', async () => {
    await access(service).localReady;
    const requestPermissions = jasmine.createSpy('requestPermissions').and.resolveTo({ display: 'granted' });
    const internals = access(service);
    internals.native = true;
    internals.localNotifications = {
      requestPermissions,
      checkPermissions: jasmine.createSpy('checkPermissions').and.resolveTo({ display: 'prompt' }),
      schedule: jasmine.createSpy('schedule').and.resolveTo({}),
    };

    await expectAsync(service.allowFromUserGesture()).toBeResolvedTo('granted');
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    if (requestPermission) {
      expect(requestPermission).not.toHaveBeenCalled();
    }
  });
});

function access(service: NotificationBridgeService): BridgeTestAccess {
  return service as unknown as BridgeTestAccess;
}
