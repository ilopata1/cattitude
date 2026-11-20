import { COACH_ARRIVAL_CAP, COACH_LOGBOOK_STALE_MS, COACH_STREAM_STALE_MS } from './coach-settings';
import {
  CoachInputHealth,
  assessCoachInputs,
  emptyCoachLedger,
  formatCoachInputLine,
  logbookCurrentFact,
  logbookPressureArrivalMs,
  preferCoachHealth,
  recordCoachDelta,
} from './coach-inputs';

export function coachInputFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const fresh = assessCoachInputs([{
    input: 'tws',
    arrivals: [0, 1_000, 2_000],
    staleAfterMs: COACH_STREAM_STALE_MS,
  }], 2_000);
  expect(fresh[0].status === 'ok', `a 0 s sample is OK, got ${fresh[0].status}`);
  expect(fresh[0].ageMs === 0, `age of a sample at now, got ${fresh[0].ageMs}`);
  expect(fresh[0].samples === 3, `three arrivals, got ${fresh[0].samples}`);
  expect(fresh[0].ratePerMin === 60, `1 Hz is 60/min, got ${fresh[0].ratePerMin}`);

  const stale = assessCoachInputs([{
    input: 'tws',
    arrivals: [0],
    staleAfterMs: COACH_STREAM_STALE_MS,
  }], COACH_STREAM_STALE_MS + 1);
  expect(stale[0].status === 'stale', `past the stream window is stale, got ${stale[0].status}`);
  expect(stale[0].ratePerMin == null, 'one arrival has no rate');

  const atLimit = assessCoachInputs([{
    input: 'tws',
    arrivals: [0],
    staleAfterMs: COACH_STREAM_STALE_MS,
  }], COACH_STREAM_STALE_MS);
  expect(atLimit[0].status === 'ok', 'a sample exactly at the stale limit is still OK');

  const missing = assessCoachInputs([{
    input: 'aws',
    arrivals: [],
    staleAfterMs: COACH_STREAM_STALE_MS,
  }], 5_000);
  expect(missing[0].status === 'missing' && missing[0].ageMs == null, 'no arrivals is missing, not a guessed age');

  const oldOutsideWindow = assessCoachInputs([{
    input: 'twd',
    arrivals: [0],
    staleAfterMs: COACH_STREAM_STALE_MS,
    rateWindowMs: 10 * 60 * 1000,
  }], 20 * 60 * 1000);
  expect(
    oldOutsideWindow[0].status === 'stale' && oldOutsideWindow[0].samples === 1,
    'an old sample stays stale rather than disappearing from the window',
  );

  const sails = assessCoachInputs([{
    input: 'sails',
    arrivals: [],
    staleAfterMs: null,
    presentWithoutTime: true,
  }], 9_000);
  expect(
    sails[0].status === 'ok' && sails[0].ageMs == null && sails[0].samples === 1,
    'sails already up, with no stored change time, stay OK and do not invent an age',
  );
  expect(
    formatCoachInputLine(sails[0]) === 'Sails up — OK · age not recorded',
    `sail line, got ${formatCoachInputLine(sails[0])}`,
  );

  const held = assessCoachInputs([{
    input: 'sails',
    arrivals: [1_000],
    staleAfterMs: null,
  }], 60 * 60 * 1000);
  expect(held[0].status === 'ok', 'a crew sail entry does not expire on the stream clock');

  expect(
    formatCoachInputLine(fresh[0]) === 'True wind speed — OK · 0 s ago · 60/min',
    `fresh line, got ${formatCoachInputLine(fresh[0])}`,
  );
  expect(
    formatCoachInputLine(missing[0]) === 'Apparent wind speed — Missing',
    `missing line, got ${formatCoachInputLine(missing[0])}`,
  );
  const slow = { ...fresh[0], ageMs: 120_000, ratePerMin: 0.5, status: 'stale' as const };
  expect(
    formatCoachInputLine(slow) === 'True wind speed — Stale · 2 min ago · 0.5/min',
    `stale line, got ${formatCoachInputLine(slow)}`,
  );

  const livePressure: CoachInputHealth = {
    input: 'pressure', status: 'stale', ageMs: 20_000, ratePerMin: null, samples: 1,
  };
  const loggedPressure: CoachInputHealth = {
    input: 'pressure', status: 'ok', ageMs: 10 * 60 * 1000, ratePerMin: null, samples: 1,
  };
  const keptStale = preferCoachHealth(livePressure, loggedPressure);
  expect(keptStale.status === 'stale', 'a stale barometer is not replaced by an older log entry');
  const onlyLog = preferCoachHealth(
    { input: 'pressure', status: 'missing', ageMs: null, ratePerMin: null, samples: 0 },
    loggedPressure,
  );
  expect(onlyLog.status === 'ok' && onlyLog.input === 'pressure', 'the log supplies pressure only when the live path was never seen');

  const liveCurrent = logbookCurrentFact(
    { setDeg: 90, driftKn: 0.4, setAtMs: 5_000, driftAtMs: 4_000 },
    [{ atMs: 9_000, setDeg: 10, driftKn: 1 }],
  );
  expect(liveCurrent?.atMs === 4_000 && liveCurrent.source === 'live', 'live set and drift use the older of the two times');
  const half = logbookCurrentFact(
    { setDeg: 90, driftKn: null, setAtMs: 5_000, driftAtMs: null },
    [],
  );
  expect(half == null, 'set without drift is not a current');
  const fromEntry = logbookCurrentFact(
    { setDeg: null, driftKn: null, setAtMs: null, driftAtMs: null },
    [
      { atMs: 2_000, setDeg: null, driftKn: 1 },
      { atMs: 1_000, setDeg: 180, driftKn: 0.2 },
    ],
  );
  expect(fromEntry?.source === 'entry' && fromEntry.atMs === 1_000, 'the newest complete log entry supplies current');
  expect(
    logbookPressureArrivalMs([{ atMs: 50, pressureHpa: null }, { atMs: 40, pressureHpa: 1013 }]) === 40,
    'pressure trend alone is not a pressure sample',
  );
  expect(COACH_LOGBOOK_STALE_MS === 3 * 60 * 60 * 1000, 'logbook freshness stays on the default 3 h interval');

  let ledger = emptyCoachLedger();
  ledger = recordCoachDelta(ledger, {
    updates: [{
      timestamp: '2026-11-20T12:00:00.000Z',
      values: [
        { path: 'self.environment.wind.speedApparent', value: 8 },
        { path: 'environment.wind.angleApparent', value: 0.4 },
        { path: 'navigation.headingMagnetic', value: 1 },
        { path: 'navigation.speed', value: 3 },
        { path: 'environment.wind.speedTrue', value: null },
      ],
    }],
  }, 0);
  expect(ledger.arrivals.aws?.length === 1, 'apparent wind speed is its own input');
  expect(ledger.arrivals.awa?.length === 1, 'apparent wind angle is recorded');
  expect(ledger.arrivals.tws == null, 'apparent wind is not copied into true wind speed');
  expect(ledger.arrivals.heading == null, 'magnetic heading is not true heading');
  expect(ledger.arrivals.stw == null, 'navigation.speed is not speed through water');

  const at = Date.parse('2026-11-20T12:00:01.000Z');
  ledger = recordCoachDelta(ledger, {
    updates: [{
      timestamp: '2026-11-20T12:00:01.000Z',
      values: [
        { path: 'vessels.urn:mrn:imo:mmsi:123456789.environment.wind.speedTrue', value: 7 },
        { path: 'environment.wind.angleTrueGround', value: 1.2 },
        { path: 'environment.wind.directionTrue', value: 2 },
        { path: 'navigation.speedThroughWater', value: 3 },
        { path: 'navigation.speedOverGround', value: 3.1 },
        { path: 'navigation.headingTrue', value: 1.5 },
        { path: 'navigation.courseOverGroundTrue', value: 1.6 },
        { path: 'navigation.rateOfTurn', value: 0 },
        { path: 'environment.outside.pressure', value: 101325 },
        { path: 'steering.rudderAngle.port', value: 0.1 },
        { path: 'steering.rudderAngle.starboard', value: 0.3 },
        { path: 'navigation.attitude', value: { pitch: 0.01, roll: -0.02 } },
        { path: 'navigation.attitude.accelZ', value: 0 },
        { path: 'steering.autopilot.state', value: 'auto' },
      ],
    }],
  }, 0);
  expect(ledger.arrivals.tws?.length === 1 && ledger.arrivals.tws[0] === at, 'prefixed true wind speed counts once');
  expect(ledger.arrivals.twa?.length === 1, 'angleTrueGround counts as true wind angle');
  expect(ledger.arrivals.rateOfTurn?.length === 1, 'a zero rate of turn is still present');
  expect(ledger.arrivals.rudder?.length === 1, 'a port and starboard pair is one rudder sample');
  expect(ledger.arrivals.attitude?.length === 1, 'pitch and roll on navigation.attitude count');
  expect(ledger.arrivals.accelZ?.length === 1, 'zero vertical acceleration is present');
  expect(ledger.arrivals.autopilot?.length === 1, 'autopilot state auto is present');
  expect(ledger.arrivals.pressure?.length === 1, 'outside pressure is present');

  const again = recordCoachDelta(ledger, {
    updates: [{
      timestamp: '2026-11-20T12:00:01.000Z',
      values: [{ path: 'environment.wind.speedTrue', value: 7 }],
    }],
  }, 0);
  expect(again === ledger, 'the same timestamp is not a second sample');

  const primaryOnly = recordCoachDelta(emptyCoachLedger(), {
    updates: [{ values: [{ path: 'steering.rudderAngle', value: 0.04 }] }],
  }, 4_000);
  expect(primaryOnly.arrivals.rudder?.length === 1, 'the single rudder angle counts when the pair is absent');

  ledger = recordCoachDelta(ledger, {
    updates: [{
      values: [
        { path: 'steering.rudderAngle', value: 'bad' },
        { path: 'navigation.attitude', value: { yaw: 1 } },
        { path: 'steering.autopilot.state', value: '  ' },
        { path: 'notifications.steering.autopilot', value: { state: 'alarm', message: 'off course' } },
      ],
    }],
  }, 8_000);
  expect(ledger.arrivals.rudder?.length === 1, 'a non-numeric rudder adds no sample');
  expect(ledger.arrivals.attitude?.length === 1, 'yaw without pitch or roll is not attitude');
  expect(ledger.arrivals.autopilot?.length === 2, 'an autopilot notification counts, a blank state does not');

  ledger = recordCoachDelta(emptyCoachLedger(), {
    updates: [{
      values: [{ path: 'navigation.attitude.pitch', value: -0.01 }, { path: 'navigation.attitude.roll', value: 0.02 }],
    }],
  }, 3_000);
  expect(ledger.arrivals.attitude?.length === 1, 'separate pitch and roll paths are one attitude sample');

  let capped = emptyCoachLedger();
  for (let i = 0; i < COACH_ARRIVAL_CAP + 5; i++) {
    capped = recordCoachDelta(capped, {
      updates: [{ values: [{ path: 'environment.wind.speedTrue', value: i }] }],
    }, i * 1000);
  }
  const kept = capped.arrivals.tws ?? [];
  expect(kept.length === COACH_ARRIVAL_CAP, `arrival log caps at ${COACH_ARRIVAL_CAP}, got ${kept.length}`);
  expect(kept[kept.length - 1] === (COACH_ARRIVAL_CAP + 4) * 1000, 'the cap keeps the newest arrivals');

  return failures;
}
