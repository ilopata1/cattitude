import {
  boatAction,
  entriesFromLogentriesBody,
  mergeTrack,
  parseBoatRevs,
  recorderIsFresh,
  recorderStatusFresh,
} from './logbook-remote';

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

describe('boat revisions', () => {
  it('reads revisions and refuses a partial set', () => {
    expect(parseBoatRevs({ settings: 1, passage: 2, rota: 0, sails: 4, alerts: 1, entries: 9 }))
      .toEqual({ settings: 1, passage: 2, rota: 0, sails: 4, alerts: 1, entries: 9 });
    expect(parseBoatRevs({ passage: 2 })).toBeNull();
    expect(parseBoatRevs(undefined)).toBeNull();
  });

  it('judges the recorder by the boat clock when the boat sends one', () => {
    const phoneAhead = Date.parse('2026-06-01T12:05:00.000Z');
    const status = { recordingAt: '2026-06-01T12:00:00.000Z', now: '2026-06-01T12:00:05.000Z' };
    expect(recorderStatusFresh(status, phoneAhead)).toBeTrue();
    expect(recorderStatusFresh({ recordingAt: status.recordingAt }, phoneAhead)).toBeFalse();
    expect(recorderStatusFresh(null, phoneAhead)).toBeFalse();
  });

  it('adopts newer boat parts and resends after the boat lost its state', () => {
    expect(boatAction(null, 0)).toBe('adopt');
    expect(boatAction(3, 4)).toBe('adopt');
    expect(boatAction(4, 4)).toBe('keep');
    expect(boatAction(4, 0)).toBe('resend');
  });
});

describe('boat track merge', () => {
  it('prefers boat samples and keeps local ones only where the boat has a gap', () => {
    const boat = [{ at: 0, src: 'boat' }, { at: 10_000, src: 'boat' }, { at: 1_000_000, src: 'boat' }];
    const local = [{ at: 5_000, src: 'phone' }, { at: 500_000, src: 'phone' }];
    expect(mergeTrack(boat, local).map(sample => `${sample.at}:${sample.src}`))
      .toEqual(['0:boat', '10000:boat', '500000:phone', '1000000:boat']);
    expect(mergeTrack([], local).length).toBe(2);
  });
});
