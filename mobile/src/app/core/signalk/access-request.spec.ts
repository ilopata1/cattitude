import { accessRequestBody, defaultDeviceName, newClientId, parseAccessReply } from './access-request';

describe('Signal K access requests', () => {
  it('asks for read/write access under a readable name', () => {
    expect(accessRequestBody('abc', '  Jo phone ')).toEqual({
      clientId: 'abc',
      description: 'Jo phone',
      permissions: 'readwrite',
    });
    expect(accessRequestBody('abc', '').description).toBe('Clever Sailor app');
  });

  it('reads pending, approved, and denied replies', () => {
    expect(parseAccessReply({ state: 'PENDING', href: '/signalk/v1/requests/1' }))
      .toEqual({ state: 'pending', href: '/signalk/v1/requests/1' });
    expect(parseAccessReply({
      state: 'COMPLETED',
      statusCode: 200,
      accessRequest: { permission: 'APPROVED', token: 'tok' },
    })).toEqual({ state: 'approved', token: 'tok' });
    expect(parseAccessReply({ state: 'COMPLETED', accessRequest: { permission: 'DENIED' } }).state)
      .toBe('denied');
    expect(parseAccessReply(null).state).toBe('error');
    expect(parseAccessReply({ state: 'COMPLETED', accessRequest: { permission: 'APPROVED' } }).state)
      .toBe('error');
  });

  it('makes a uuid-shaped client id and a device name', () => {
    expect(newClientId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(defaultDeviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('Clever Sailor on iPhone');
    expect(defaultDeviceName('')).toBe('Clever Sailor on device');
  });
});
