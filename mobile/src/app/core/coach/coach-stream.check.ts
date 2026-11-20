import { knotsFromMps, signedAngleToDegrees } from '../logbook/logbook-math';
import { COACH_SAMPLE_RETAIN_MS } from './coach-settings';
import { coachSamplesFromDelta, rememberCoachSample } from './coach-stream';

export function coachStreamFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };
  const now = Date.UTC(2026, 5, 21, 12, 0, 0);

  const awsOnly = coachSamplesFromDelta({
    updates: [{ values: [{ path: 'environment.wind.speedApparent', value: 5 }] }],
  }, now);
  expect(awsOnly.length === 1 && awsOnly[0].awsKn === knotsFromMps(5), 'apparent wind keeps its own value');
  expect(awsOnly[0].twsKn == null, 'apparent wind is not copied into true wind');

  const magnetic = coachSamplesFromDelta({
    updates: [{ values: [{ path: 'navigation.headingMagnetic', value: 1 }] }],
  }, now);
  expect(magnetic.length === 0, 'magnetic heading is not true heading');

  const logSpeed = coachSamplesFromDelta({
    updates: [{ values: [{ path: 'navigation.speed', value: 2 }] }],
  }, now);
  expect(logSpeed.length === 0, 'navigation.speed is not speed through water');

  const signed = signedAngleToDegrees(Math.PI / 2);
  const wind = coachSamplesFromDelta({
    updates: [{ values: [{ path: 'environment.wind.angleTrueWater', value: Math.PI / 2 }] }],
  }, now);
  expect(wind[0].signedTwaDeg === signed && wind[0].twaDeg === Math.abs(signed), 'true wind angle is converted from radians');

  const pilot = coachSamplesFromDelta({
    updates: [{ values: [{ path: 'steering.autopilot.state', value: 'auto' }] }],
  }, now);
  expect(pilot[0].autopilotEngaged === true && pilot[0].autopilotMode === 'auto', 'auto means the pilot is steering');

  const standby = coachSamplesFromDelta({
    updates: [{ values: [{ path: 'steering.autopilot.state', value: 'standby' }] }],
  }, now);
  expect(standby[0].autopilotEngaged === false && standby[0].autopilotMode === 'standby', 'standby is not engaged');

  const first = coachSamplesFromDelta({
    updates: [{ timestamp: new Date(now).toISOString(), values: [{ path: 'environment.wind.speedTrue', value: 5 }] }],
  }, now)[0];
  const second = coachSamplesFromDelta({
    updates: [{ timestamp: new Date(now + 200).toISOString(), values: [{ path: 'navigation.speedThroughWater', value: 3 }] }],
  }, now)[0];
  const merged = rememberCoachSample(rememberCoachSample([], first, now), second, now);
  expect(merged.length === 1 && merged[0].twsKn === knotsFromMps(5) && merged[0].stwKn === knotsFromMps(3), 'one second keeps both readings');

  const stale = rememberCoachSample(merged, { ...first, at: now - COACH_SAMPLE_RETAIN_MS - 5_000 }, now);
  expect(stale.length === 1 && stale[0].at === merged[0].at, 'a sample older than the retain window is dropped');

  return failures;
}
