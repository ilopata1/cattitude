import {
  readWebNotificationPermission,
  requestWebNotificationPermission,
  WebNotificationPermissionSource,
} from './notification-permission';

function source(permission: NotificationPermission): WebNotificationPermissionSource & {
  requestPermission: jasmine.Spy;
} {
  return {
    permission,
    requestPermission: jasmine.createSpy('requestPermission').and.resolveTo('granted'),
  };
}

describe('notification permission', () => {
  it('reads a missing API as unsupported', () => {
    expect(readWebNotificationPermission(undefined)).toBe('unsupported');
  });

  it('does not ask again once permission is settled', async () => {
    const denied = source('denied');
    await expectAsync(requestWebNotificationPermission(denied)).toBeResolvedTo('denied');
    expect(denied.requestPermission).not.toHaveBeenCalled();
  });

  it('asks only while permission is still the default', async () => {
    const pending = source('default');
    await expectAsync(requestWebNotificationPermission(pending)).toBeResolvedTo('granted');
    expect(pending.requestPermission).toHaveBeenCalledTimes(1);
  });
});
