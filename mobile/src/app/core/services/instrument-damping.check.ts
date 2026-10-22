import {
  AngleDamper,
  DAMPING_SNAP,
  DAMPING_TAU_S,
  GAP_RESET_MS,
  SNAP_PERSIST_MS,
  ScalarDamper,
  TIMESTAMP_SKEW_MS,
  VectorDamper,
  sampleTimeMs,
} from './instrument-damping';

export function instrumentDampingFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const scalar = new ScalarDamper(2);
  expect(scalar.push(4, 0) === 4 && scalar.value === 4, 'first scalar sample is returned unchanged');

  scalar.push(6, 1_000);
  const reseed = scalar.push(8, 1_000 + GAP_RESET_MS + 1);
  expect(reseed === 8, `a gap past ${GAP_RESET_MS} ms re-seeds the scalar (got ${reseed})`);

  const rewind = new ScalarDamper(2);
  rewind.push(1, 5_000);
  expect(rewind.push(3, 5_000) === 3, 'a zero time step re-seeds');
  expect(rewind.push(6, 4_000) === 6, 'a backward time step re-seeds');

  const tauS = 2;
  const step = 10;
  const lagged = new ScalarDamper(tauS);
  lagged.push(0, 0);
  const atTau = lagged.push(step, tauS * 1000);
  const oneTau = 1 - Math.exp(-1);
  expect(
    Math.abs(atTau / step - oneTau) <= 0.02,
    `after one tau the step is about 63% complete (got ${atTau}, want ${step * oneTau})`,
  );

  const endMs = 3_000;
  const slow = steppedScalar(1_000, endMs, tauS, step);
  const fast = steppedScalar(100, endMs, tauS, step);
  expect(
    Math.abs(slow - fast) <= step * 0.02,
    `1 Hz and 10 Hz agree at 3 s (got ${slow} and ${fast})`,
  );

  const angle = new AngleDamper(tauS);
  expect(angle.push(350, 0) === 350, 'first angle sample is returned unchanged');
  let previous = 350;
  let crossedZero = false;
  let leftShortArc = false;
  let inRange = true;
  for (let t = 200; t <= 20_000; t += 200) {
    const next = angle.push(10, t);
    if (!(next >= 0 && next < 360)) inRange = false;
    if (!(next <= 20 || next >= 340)) leftShortArc = true;
    if (previous >= 340 && next <= 20) crossedZero = true;
    previous = next;
  }
  expect(inRange, 'angle output stays inside [0, 360)');
  expect(crossedZero && !leftShortArc, '350° to 10° moves through 0° and not through 180°');
  expect(
    angle.value !== null && shortestErrorDeg(angle.value, 10) < 1,
    `angle settles on 10° (got ${angle.value})`,
  );

  const angleGap = new AngleDamper(tauS);
  angleGap.push(20, 0);
  const angleReseed = angleGap.push(80, GAP_RESET_MS + 1);
  expect(angleReseed === 80, `an angle gap re-seeds (got ${angleReseed})`);

  const wind = new VectorDamper(DAMPING_TAU_S.trueWind);
  const seeded = wind.push(0, 10, 0);
  expect(seeded.angleDeg === 0 && seeded.speed === 10, 'first wind sample is returned unchanged');
  let dipped = false;
  let midSpeed = 10;
  let midAngle = 0;
  const horizon = 5 * DAMPING_TAU_S.trueWind * 1000;
  for (let t = 100; t <= horizon; t += 100) {
    const next = wind.push(180, 10, t);
    if (next.speed < 1) dipped = true;
    if (t === 2_000) {
      midSpeed = next.speed;
      midAngle = next.angleDeg;
    }
  }
  const settled = wind.value;
  expect(dipped, 'a 180° reversal dips the filtered speed');
  expect(
    midSpeed < 5 && shortestErrorDeg(midAngle, 0) < 45,
    `the reversal has not snapped by 2 s (speed ${midSpeed}, angle ${midAngle})`,
  );
  expect(
    settled !== null && shortestErrorDeg(settled.angleDeg, 180) < 1,
    `wind angle settles on the new direction (got ${settled?.angleDeg})`,
  );
  expect(
    settled !== null && Math.abs(settled.speed - 10) <= 10 * 0.02,
    `wind speed settles back on the original speed (got ${settled?.speed})`,
  );

  const windGap = new VectorDamper(2);
  windGap.push(10, 8, 0);
  const windReseed = windGap.push(90, 4, GAP_RESET_MS + 1);
  expect(
    windReseed.angleDeg === 90 && windReseed.speed === 4,
    'a wind gap re-seeds angle and speed',
  );

  const snapping = new AngleDamper(tauS);
  snapping.push(0, 0);
  const once = snapping.push(90, 100);
  expect(once !== 90, `a single angle sample past the snap threshold does not snap (got ${once})`);
  let held = once;
  for (let t = 200; t <= 100 + SNAP_PERSIST_MS; t += 100) {
    held = snapping.push(90, t);
  }
  expect(held === 90, `an angle error held for ${SNAP_PERSIST_MS} ms snaps (got ${held})`);

  const speedSnap = {
    fraction: DAMPING_SNAP.speedFraction,
    floor: DAMPING_SNAP.speedFloorKn,
  };
  const speed = new ScalarDamper(tauS, speedSnap);
  speed.push(10, 0);
  const oneSpeed = speed.push(20, 100);
  expect(oneSpeed !== 20, `a single speed sample past the snap threshold does not snap (got ${oneSpeed})`);
  let heldSpeed = oneSpeed;
  for (let t = 200; t <= 100 + SNAP_PERSIST_MS; t += 100) {
    heldSpeed = speed.push(20, t);
  }
  expect(
    heldSpeed === 20,
    `a speed error held for ${SNAP_PERSIST_MS} ms snaps (got ${heldSpeed})`,
  );

  const depth = new ScalarDamper(DAMPING_TAU_S.depth);
  depth.push(2, 0);
  let depthValue = 2;
  for (let t = 500; t <= 5_000; t += 500) {
    depthValue = depth.push(12, t);
  }
  const depthExpected = 2 + 10 * (1 - Math.exp(-5 / DAMPING_TAU_S.depth));
  expect(
    Math.abs(depthValue - depthExpected) < 0.05 && depthValue !== 12,
    `depth follows its time constant and does not snap (got ${depthValue}, want ${depthExpected})`,
  );

  const now = Date.UTC(2026, 0, 1);
  expect(sampleTimeMs(undefined, now) === now, 'a missing timestamp falls back to now');
  expect(sampleTimeMs(null, now) === now, 'a null timestamp falls back to now');
  expect(sampleTimeMs('', now) === now, 'an empty timestamp falls back to now');
  expect(sampleTimeMs('not-a-time', now) === now, 'an unparsable timestamp falls back to now');
  expect(
    sampleTimeMs(new Date(now + TIMESTAMP_SKEW_MS + 1).toISOString(), now) === now,
    'a timestamp more than 5 s ahead falls back to now',
  );
  expect(
    sampleTimeMs(new Date(now - TIMESTAMP_SKEW_MS - 1).toISOString(), now) === now,
    'a timestamp more than 5 s behind falls back to now',
  );
  expect(
    sampleTimeMs(new Date(now - 1_500).toISOString(), now) === now - 1_500,
    'a timestamp within 5 s is used',
  );
  expect(
    sampleTimeMs(new Date(now + TIMESTAMP_SKEW_MS).toISOString(), now) === now + TIMESTAMP_SKEW_MS,
    'a timestamp exactly 5 s off is used',
  );

  return failures;
}

function steppedScalar(periodMs: number, endMs: number, tauS: number, step: number): number {
  const damper = new ScalarDamper(tauS);
  damper.push(0, 0);
  let value = 0;
  for (let t = periodMs; t <= endMs; t += periodMs) {
    value = damper.push(step, t);
  }
  return value;
}

function shortestErrorDeg(from: number, to: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return Math.abs(delta);
}
