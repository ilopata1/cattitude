export type DeviceNotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface WebNotificationPermissionSource {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

export function readWebNotificationPermission(
  notification: WebNotificationPermissionSource | undefined,
): DeviceNotificationPermission {
  if (!notification) {
    return 'unsupported';
  }
  return fromWebPermission(notification.permission);
}

/**
 * Must be called in the same turn as a tap. Browsers drop the prompt otherwise.
 * An already-settled permission is returned without asking again.
 */
export function requestWebNotificationPermission(
  notification: WebNotificationPermissionSource | undefined,
): Promise<DeviceNotificationPermission> {
  if (!notification || typeof notification.requestPermission !== 'function') {
    return Promise.resolve('unsupported');
  }
  if (notification.permission !== 'default') {
    return Promise.resolve(fromWebPermission(notification.permission));
  }
  return notification.requestPermission().then(permission => fromWebPermission(permission));
}

export function fromDevicePermission(display: string): DeviceNotificationPermission {
  if (display === 'granted') {
    return 'granted';
  }
  if (display === 'denied') {
    return 'denied';
  }
  return 'prompt';
}

function fromWebPermission(permission: NotificationPermission): DeviceNotificationPermission {
  if (permission === 'granted' || permission === 'denied') {
    return permission;
  }
  return 'prompt';
}
