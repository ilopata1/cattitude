import { entriesFromLogentriesBody, recorderIsFresh } from './logbook-remote';

describe('logbook remote entries', () => {
  it('keeps a Clever Sailor row and a manual line, and drops the plugin hourly row', () => {
    const entries = entriesFromLogentriesBody({
      '11111111-1111-4111-8111-111111111111': {
        id: '11111111-1111-4111-8111-111111111111',
        datetime: '2026-06-01T03:00:00.000Z',
        text: 'Interval',
        origin: 'agent',
        'x-cattitude': {
          id: '11111111-1111-4111-8111-111111111111',
          at: '2026-06-01T03:00:00.000Z',
          trigger: 'interval',
          updatedAt: '2026-06-01T03:00:00.000Z',
          depthM: 8,
        },
      },
      '22222222-2222-4222-8222-222222222222': {
        id: '22222222-2222-4222-8222-222222222222',
        datetime: '2026-06-01T04:01:00.000Z',
        text: 'Hourly log',
        origin: 'auto',
      },
      '33333333-3333-4333-8333-333333333333': {
        id: '33333333-3333-4333-8333-333333333333',
        datetime: '2026-06-01T05:00:00.000Z',
        text: 'Reefed the main',
        origin: 'manual',
        timestamp: '2026-06-01T05:05:00.000Z',
      },
    });

    expect(entries.map(entry => entry.id)).toEqual([
      '33333333-3333-4333-8333-333333333333',
      '11111111-1111-4111-8111-111111111111',
    ]);
    expect(entries[1].depthM).toBe(8);
    expect(entries[0].remarks).toBe('Reefed the main');
  });

  it('treats a recorder heartbeat older than 90 seconds as stopped', () => {
    const now = Date.parse('2026-06-01T12:00:00.000Z');
    expect(recorderIsFresh('2026-06-01T11:59:00.000Z', now)).toBeTrue();
    expect(recorderIsFresh('2026-06-01T11:58:00.000Z', now)).toBeFalse();
    expect(recorderIsFresh(null, now)).toBeFalse();
  });
});
