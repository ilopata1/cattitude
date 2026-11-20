import { AB_SETTLE_MS, circularSdDeg, sampleSd } from '../ab-test/ab-test';
import { SailPlan } from '../models/sail-plan.model';
import { buildCoachSnapshot } from './coach-snapshot';
import { CoachSnapshot } from './coach.model';
import {
  helmBiasDeg,
  helmWorkload,
  isNightAt,
  nextCutover,
  pressureTrendHpa,
  speedExcursions,
  stwResidualKn,
  stwSensorSuspect,
  twsTrendKnPerHour,
} from './coach-features';
import { HELM_SETTLE_MS } from './coach-settings';

export function coachFeatureFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  expect(HELM_SETTLE_MS === AB_SETTLE_MS, 'helm settle stays the A/B settle');

  const steadyHelm = helmBiasDeg([
    { twaDeg: 60, weatherHelmDeg: 4 },
    { twaDeg: 61, weatherHelmDeg: 4 },
    { twaDeg: 59, weatherHelmDeg: 4 },
  ]);
  expect(steadyHelm === 4, `steady true wind keeps the helm bias, got ${steadyHelm}`);
  const wide = [0, 40].map(twaDeg => ({ twaDeg, weatherHelmDeg: 4 }));
  expect(sampleSd(wide.map(sample => sample.twaDeg)) >= 8, 'the wide pair is at least 8° of spread');
  expect(helmBiasDeg(wide) == null, 'true wind spread of 8° or more drops the helm bias');
  const onTheLine = [0, 8 * Math.SQRT2];
  expect(Math.abs(sampleSd(onTheLine) - 8) < 1e-9, `constructed spread should be 8°, got ${sampleSd(onTheLine)}`);
  expect(helmBiasDeg(onTheLine.map(twaDeg => ({ twaDeg, weatherHelmDeg: 1 }))) == null, 'spread of exactly 8° is not steady');
  expect(helmBiasDeg([{ twaDeg: 60, weatherHelmDeg: 4 }]) == null, 'one true-wind sample cannot show a steady window');
  expect(helmBiasDeg([{ twaDeg: 60, weatherHelmDeg: null }, { twaDeg: 61, weatherHelmDeg: null }]) == null, 'missing helm is null');

  const changeAt = 2_000;
  const settled = helmWorkload([
    { at: 0, headingDeg: 0, rudderDeg: 2 },
    { at: 1_000, headingDeg: 0, rudderDeg: 2 },
    { at: changeAt, headingDeg: 40, rudderDeg: 20 },
    { at: changeAt + HELM_SETTLE_MS - 1, headingDeg: 50, rudderDeg: 20 },
    { at: changeAt + HELM_SETTLE_MS, headingDeg: 40, rudderDeg: 2 },
  ]);
  expect(settled.rudderSdDeg === 0, `a tack's settle is left out of rudder spread, got ${settled.rudderSdDeg}`);
  expect(settled.headingSdDeg === circularSdDeg([0, 0, 40]), 'settle headings are left out of heading spread');
  const exact = helmWorkload([
    { at: 0, headingDeg: 0, rudderDeg: 2 },
    { at: 1_000, headingDeg: 20, rudderDeg: 10 },
    { at: 2_000, headingDeg: 20, rudderDeg: 2 },
  ]);
  expect(exact.rudderSdDeg != null && exact.rudderSdDeg > 0, 'a 20° heading change does not start the settle');
  const small = helmWorkload([
    { at: 0, headingDeg: 0, rudderDeg: 2 },
    { at: 1_000, headingDeg: 10, rudderDeg: 10 },
    { at: 2_000, headingDeg: 10, rudderDeg: 2 },
  ]);
  expect(small.rudderSdDeg != null && small.rudderSdDeg > 0, 'a 10° heading change does not start the settle');

  const now = 8_000;
  const above = (at: number, stwKn = 11) => ({ at, stwKn, targetKn: 8 });
  expect(speedExcursions([0, 1_000, 2_000, 3_000].map(at => above(at)), 10, now) === 1, 'four seconds above 25% is one surf');
  expect(speedExcursions([0, 1_000, 2_000].map(at => above(at)), 10, now) === 0, 'a two-second run is not a surf');
  expect(speedExcursions([
    ...[0, 1_000, 2_000, 3_000].map(at => above(at)),
    above(4_000, 8),
    ...[5_000, 6_000, 7_000, 8_000].map(at => above(at)),
  ], 10, now) === 2, 'two separate runs are two surfs');
  expect(speedExcursions([0, 1_000, 2_000, 3_000].map(at => above(at, 10)), 10, now) === 0, 'exactly 25% above target is not a surf');
  expect(speedExcursions([
    ...[0, 1_000, 2_000, 3_000].map(at => above(at)),
    ...[5_000, 6_000, 7_000, 8_000].map(at => above(at)),
  ], 10, now) === 2, 'a gap longer than the polar sample interval splits one run into two');
  expect(speedExcursions([above(0)], 61, now) == null, 'a window longer than the polar history has no surf count');

  const north = { stwKn: 6, headingDeg: 0, sogKn: 6, cogDeg: 0 };
  const calm = stwResidualKn([north], { setDeg: 0, driftKn: 0 });
  expect(calm === 0, `no current leaves no residual, got ${calm}`);
  expect(stwSensorSuspect(calm, 6) === false, 'a zero residual is not a bad log');
  const pushed = stwResidualKn([north], { setDeg: 90, driftKn: 2 });
  expect(pushed === 2, `a 2 kn current the log ignores is a 2 kn residual, got ${pushed}`);
  expect(stwSensorSuspect(pushed, 6) === true, '2 kn on 6 kn of boat speed doubts the log');
  expect(stwSensorSuspect(0.4, 6) === false, '0.4 kn is under the residual gate');
  expect(stwSensorSuspect(0.6, 20) === false, '0.6 kn is under 7% of 20 kn');
  expect(stwSensorSuspect(0.5, 6) === false, 'the residual gate is strictly above 0.5 kn');
  expect(stwSensorSuspect(0.7, 10) === false, 'the fraction gate is strictly above 7%');
  expect(stwSensorSuspect(0.71, 10) === true, 'above both gates doubts the log');
  const missingCurrent = stwResidualKn([north], null);
  expect(missingCurrent == null && stwSensorSuspect(missingCurrent, 6) === false, 'missing current is not a residual and not a bad log');
  const spike = stwResidualKn(
    [...Array.from({ length: 10 }, () => north), { stwKn: 11, headingDeg: 0, sogKn: 6, cogDeg: 0 }],
    { setDeg: 0, driftKn: 0 },
  );
  expect(spike != null && spike < 0.5 && stwSensorSuspect(spike, 6) === false, `one spike does not flag the window, got ${spike}`);

  const hour = [0, 30 * 60_000, 60 * 60_000];
  const trend = twsTrendKnPerHour(hour, [16, 20, 24]);
  expect(trend != null && Math.abs(trend - 8) < 1e-9, `16 to 24 kn in an hour is +8 kn/h, got ${trend}`);
  expect(twsTrendKnPerHour([0, 1], [1, 2]) == null, 'two points have no trend');
  expect(pressureTrendHpa(-2.5) === -2.5, 'pressure trend passes through');
  expect(pressureTrendHpa(null) == null && pressureTrendHpa(Number.NaN) == null, 'a missing pressure trend stays null');

  const plan = sailPlan(false);
  const rising = nextCutover(plan, 60, 18, 0, 0.1);
  expect(rising?.kind === 'tws' && rising.value === 20 && rising.distance === 2 && rising.approaching === true, `rising breeze approaches 20 kn, got ${JSON.stringify(rising)}`);
  const falling = nextCutover(plan, 60, 18, 0, -0.1);
  expect(falling?.approaching === false, 'a falling breeze is not approaching the upper edge');
  expect(nextCutover(plan, 60, 18, 0, null)?.approaching === false, 'no slope is not approaching');
  expect(nextCutover(plan, 60, 18, 0, 0)?.approaching === false, 'a flat slope is not approaching');
  const easing = nextCutover(plan, 60, 21, 0, -0.1);
  expect(easing?.kind === 'tws' && easing.value === 20 && easing.approaching === true, `easing toward 20 kn, got ${JSON.stringify(easing)}`);
  expect(nextCutover(plan, 60, 21, 0, 0.1)?.approaching === false, 'a rising breeze is not approaching the lower edge');
  const heavy = nextCutover(sailPlan(true), 60, 18, 0.1, 0.1);
  expect(heavy?.kind === 'twa' && heavy.value === 90, `heavy weather keeps only the angle edge, got ${JSON.stringify(heavy)}`);
  expect(nextCutover(null, 60, 18, 0, 0.1) == null, 'no sail plan has no cutover');

  const noon = Date.UTC(2026, 5, 21, 12, 0, 0);
  const midnight = Date.UTC(2026, 5, 21, 0, 0, 0);
  expect(isNightAt(null, noon) === false, 'no position is not night');
  expect(isNightAt({ lat: 50, lon: 0 }, noon) === false, 'midsummer noon is day');
  expect(isNightAt({ lat: 50, lon: 0 }, midnight) === true, 'midsummer midnight is night');

  const wired = buildCoachSnapshot({
    builtAt: now,
    windowMin: 10,
    vessel: vessel(),
    samples: [{ at: now, twsKn: 18, twaDeg: 60, stwKn: 6, sogKn: 6, headingDeg: 0, cogDeg: 0 }],
    dataHealth: ['tws', 'twa', 'stw', 'sog', 'heading', 'cog'].map(input => ({ input, status: 'ok' as const })),
    current: { setDeg: 90, driftKn: 2 },
    polarSamples: [0, 1_000, 2_000, 3_000].map(at => above(at)),
    sailPlan: plan,
  });
  expect(wired.performance.stwSogResidualKn === 2 && wired.performance.sensorSuspect === true, 'the snapshot keeps the log residual');
  expect(wired.downwind.speedExcursions === 1, 'the snapshot counts the surfs it was given');
  expect(wired.sails.nextCutover?.kind === 'tws' && wired.sails.nextCutover.value === 20, 'the snapshot names the nearest cutover');
  const unwired = buildCoachSnapshot({
    builtAt: now,
    windowMin: 10,
    vessel: vessel(),
    samples: [{ at: now, stwKn: 6, sogKn: 6, headingDeg: 0, cogDeg: 0 }],
    dataHealth: ['stw', 'sog', 'heading', 'cog'].map(input => ({ input, status: 'ok' as const })),
  });
  expect(unwired.performance.stwSogResidualKn == null && unwired.performance.sensorSuspect === false, 'without current the log is not flagged');
  expect(unwired.downwind.speedExcursions == null && unwired.sails.nextCutover == null, 'missing samples leave surf and cutover empty');

  return failures;
}

function sailPlan(heavy: boolean): SailPlan {
  return {
    name: 'test',
    sails: ['Main'],
    twaCuts: [0, 70, 110, 180],
    twsCuts: [0, 20, 30],
    cells: [],
    heavyWeather: {
      enabled: heavy,
      twsFrom: 10,
      twaCuts: [0, 90, 180],
      cells: [],
    },
  };
}

function vessel(): CoachSnapshot['vessel'] {
  return {
    slug: 'cattitude',
    hullType: 'cat',
    hasDaggerboards: false,
    lWlM: 14,
    polarFile: 'outremer-55sc.pol',
  };
}
