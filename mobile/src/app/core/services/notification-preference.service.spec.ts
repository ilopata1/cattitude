import { TestBed } from '@angular/core/testing';
import { NotificationPreferenceService } from './notification-preference.service';

const STORAGE_KEY = 'cattitude.notifications.enabled';

describe('NotificationPreferenceService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('defaults to on without asking the browser', () => {
    const request = typeof Notification === 'undefined'
      ? null
      : spyOn(Notification, 'requestPermission');
    const prefs = TestBed.inject(NotificationPreferenceService);

    expect(prefs.enabled()).toBeTrue();
    if (request) {
      expect(request).not.toHaveBeenCalled();
    }
  });

  it('stays off once turned off', () => {
    TestBed.inject(NotificationPreferenceService).setEnabled(false);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(NotificationPreferenceService).enabled()).toBeFalse();
  });
});
