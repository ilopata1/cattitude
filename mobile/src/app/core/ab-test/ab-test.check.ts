import {
  AB_BLOCK_MS,
  AB_SETTLE_MS,
  AbLeg,
  AbSample,
  AbSession,
  AbSetup,
  armLeg,
  buildReport,
  canStart,
  emptySession,
  emptySetup,
  formatClock,
  meanAndError,
  noteAlarm,
  requestRerun,
  revealResults,
  startTest,
  studentTCdf,
  tick,
  welchConfidence,
  absoluteOffBow,
  combinedRudderDeg,
  weatherHelmDeg,
} from './ab-test';

export function abTestFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  expect(formatClock(AB_BLOCK_MS) === '6:30', 'a full part is 6:30');
  expect(formatClock(AB_SETTLE_MS) === '1:30', 'settling time is 1:30');
  expect(absoluteOffBow(10, 40) === 30, 'true wind 10° off a 40° heading is 30° off the bow');
  expect(weatherHelmDeg(-4, 40) === 4, 'port rudder on starboard tack is weather helm');
  expect(weatherHelmDeg(3, -40) === 3, 'starboard rudder on port tack is weather helm');
  expect(weatherHelmDeg(2, 40) === -2, 'rudder toward the wind is lee helm');
  expect(weatherHelmDeg(1, 0) === null, 'helm needs a settled tack');
  const paired = combinedRudderDeg(null, -0.1, -0.2);
  expect(paired != null && Math.abs(paired - ((-0.1 - 0.2) / 2) * (180 / Math.PI)) < 1e-9, 'twin rudders are averaged');

  const setup = filledSetup();
  expect(!canStart({ ...setup, settingB: '42°' }), 'identical settings do not start');
  expect(!canStart({ ...setup, variableId: 'other', customVariable: ' ' }), 'an unnamed change does not start');
  expect(canStart(setup), 'two different settings can start');

  expect(Math.abs(studentTCdf(0, 20) - 0.5) < 1e-6, 'a t of zero is the middle of the distribution');
  expect(Math.abs(studentTCdf(1.7247182429, 20) - 0.95) < 0.002, 'df 20 reaches 95% at its critical value');
  expect(Math.abs(studentTCdf(1.64485362695, 10_000) - 0.95) < 0.003, 'a large df matches the normal 95% point');

  const ramp = meanAndError(Array.from({ length: 200 }, (_, index) => index));
  expect(ramp.nEff < 40, 'a steady trend is not treated as 200 independent samples');
  expect(ramp.mean != null && Math.abs(ramp.mean - 99.5) < 1e-6, 'mean of 0..199');
  const split = welchConfidence(
    { mean: 10, sem: 0.1, nEff: 100 },
    { mean: 9.5, sem: 0.1, nEff: 100 },
  );
  expect(split != null && split > 99, 'a clear half-unit gap at this precision is above 99%');

  let session = startTest(emptySession(), setup, 0);
  expect(session.phase === 'recording' && session.leg === 'A' && session.cycle === 1, 'start opens part A');
  session = noteAlarm(session, 'Off course');
  session = tick(session, AB_BLOCK_MS - 1000, null);
  expect(session.phase === 'recording', 'the part is still open just before 6½ minutes');
  session = tick(session, AB_BLOCK_MS, null);
  expect(session.phase === 'prepare' && session.leg === 'B', 'part A closes into the prompt for part B');
  expect(session.legs[0]?.alarms.join(',') === 'Off course', 'an autopilot alarm is kept with the part');
  expect(session.setup.settingA === '42°', 'the setting is kept');

  session = armLeg(session, 1_000_000);
  expect(session.phase === 'recording' && session.leg === 'B' && session.cycle === 1, 'ready starts part B');
  session = tick(session, 1_000_000 + AB_BLOCK_MS, null);
  expect(session.phase === 'rerun', 'part B offers a second cycle');
  const declined = revealResults(session);
  expect(declined.phase === 'results', 'the crew can score the single cycle');
  expect(buildReport(declined)?.cycles === 1, 'one cycle is labelled as one cycle');

  session = requestRerun(session);
  expect(session.phase === 'prepare' && session.cycle === 2 && session.leg === 'A', 'a rerun returns to part A');
  expect(session.setup.settingB === '38°', 'a rerun keeps both settings');
  session = armLeg(session, 2_000_000);
  session = tick(session, 2_000_000 + AB_BLOCK_MS, null);
  expect(session.phase === 'prepare' && session.leg === 'B' && session.cycle === 2, 'the second part A still waits for part B');
  session = armLeg(session, 3_000_000);
  session = tick(session, 3_000_000 + AB_BLOCK_MS, null);
  expect(session.phase === 'results', 'the second part B opens the result');

  const comparison = buildReport(performanceSession());
  const vmg = comparison?.rows.find((row) => row.label === 'VMG of polar');
  expect(comparison?.vmg.headline === 'A is ahead on VMG', 'the higher polar VMG wins');
  expect(comparison?.vmg.confidencePct === 100, 'a noiseless gap is certain');
  expect(comparison?.vmg.detail.includes('70.0%') && comparison.vmg.detail.includes('50.0%'), 'two cycles are averaged');
  expect(comparison?.notes.some((note) => note.includes('average')), 'the result says it averaged the cycles');
  expect(vmg?.a === '70.0%' && vmg.b === '50.0%' && vmg.ahead === 'A', 'the VMG row shows the averaged percentages');
  expect(comparison?.cycles === 2, 'the performance session used two cycles');

  const wind = buildReport(windSession());
  expect(row(wind, 'Wind speed')?.a === '11.2 kn', 'settling samples stay out of the wind mean');
  expect(row(wind, 'Wind slope')?.a === '+0.50 kn/min', 'wind speed slope is knots per minute');
  expect(row(wind, 'Wind direction')?.a === '15°', 'wind direction uses the circular mean');
  expect(row(wind, 'Direction slope')?.a === '+2.0 °/min', 'direction slope follows the unwrapped series');
  const spread = Number(row(wind, 'Direction spread')?.a?.replace('°', ''));
  expect(spread < 15, 'a tight wind direction has a small circular spread');
  expect(row(wind, 'Set')?.a === '0°' && row(wind, 'Drift')?.a === '1.00 kn', 'current is the ground vector minus the water vector');
  expect(row(wind, 'Wind dropouts')?.a === '4', 'wind dropouts are counted on the scored window');

  const helm = buildReport(helmSession());
  expect(row(helm, 'Helm')?.a === '3.0° weather', 'two cycles of weather helm are averaged');
  expect(row(helm, 'Helm')?.b === '2.0° lee', 'lee helm keeps its sign');
  expect(row(helm, 'Helm spread')?.a === '0.0°', 'a steady helm has no spread');
  expect(helm?.notes.some((note) => note.includes('Weather means')), 'the result explains weather and lee helm');

  const sea = buildReport(seaSession());
  const pitch = Number(row(sea, 'Pitch')?.a?.replace('°', ''));
  const period = Number(row(sea, 'Dominant period')?.a?.split(' ')[0]);
  expect(Math.abs(pitch - 1.414) < 0.08, 'pitch RMS is the motion about the mean heel');
  expect(period > 7.6 && period < 8.4, 'an 8 second pitch cycle is the dominant period');
  expect(row(sea, 'Dominant period')?.a?.includes('pitch'), 'pitch supplies the period when it is moving');

  const heave = buildReport(heaveSession());
  const accel = Number(row(heave, 'Vertical accel')?.a?.split(' ')[0]);
  expect(accel > 0.12 && accel < 0.35, 'vertical acceleration can be derived from heave');
  expect(row(heave, 'Dominant period')?.a?.includes('heave'), 'heave supplies the period when pitch is quiet');

  return failures;
}

function row(report: ReturnType<typeof buildReport>, label: string) {
  return report?.rows.find((item) => item.kind === 'metric' && item.label === label);
}

function filledSetup(): AbSetup {
  return {
    ...emptySetup(),
    variableId: 'awa',
    settingA: '42°',
    settingB: '38°',
    main: 'Full',
    headsail: 'Solent',
    boardPort: 'Down',
    boardStarboard: 'Down',
  };
}

function point(tOffsetMs: number, extra: Partial<AbSample> = {}): AbSample {
  return {
    tOffsetMs,
    twsKn: null,
    twdDeg: null,
    stwKn: null,
    sogKn: null,
    headingDeg: null,
    cogDeg: null,
    twaDeg: null,
    signedTwaDeg: null,
    rudderDeg: null,
    targetKn: null,
    vmgSpeedKn: null,
    vmgSpeedSource: null,
    pitchRad: null,
    rollRad: null,
    heaveM: null,
    vertAccel: null,
    windMissing: false,
    speedMissing: false,
    attitudeMissing: false,
    ...extra,
  };
}

function leg(id: 'A' | 'B', cycle: 1 | 2, samples: AbSample[], alarms: string[] = [], imu: AbLeg['imu'] = []): AbLeg {
  return { id, cycle, startedAt: 0, samples, alarms, imu };
}

function session(setup: AbSetup, legs: AbLeg[]): AbSession {
  return { ...emptySession(), phase: 'results', setup, legs };
}

function steady(twa: number, stw: number, target: number, count = 30): AbSample[] {
  const samples: AbSample[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(point(AB_SETTLE_MS + i * 1000, {
      twaDeg: twa,
      twdDeg: twa,
      stwKn: stw,
      sogKn: stw,
      vmgSpeedKn: stw,
      vmgSpeedSource: 'stw',
      targetKn: target,
      headingDeg: 0,
      cogDeg: 0,
    }));
  }
  return samples;
}

function performanceSession(): AbSession {
  return session(filledSetup(), [
    leg('A', 1, steady(60, 8, 10)),
    leg('A', 2, steady(60, 6, 10)),
    leg('B', 1, steady(60, 5, 10)),
    leg('B', 2, steady(60, 5, 10)),
  ]);
}

function windSession(): AbSession {
  const samples: AbSample[] = [
    point(0, { twsKn: 99, twdDeg: 200 }),
    point(30_000, { twsKn: 99, twdDeg: 200 }),
    point(60_000, { twsKn: 99, twdDeg: 200 }),
  ];
  for (let i = 0; i < 30; i++) {
    const t = AB_SETTLE_MS + i * 10_000;
    const minutes = (t - AB_SETTLE_MS) / 60_000;
    samples.push(point(t, {
      twsKn: 10 + 0.5 * minutes,
      twdDeg: 10 + 2 * minutes,
      stwKn: 6,
      sogKn: 7,
      headingDeg: 0,
      cogDeg: 0,
      windMissing: i < 4,
    }));
  }
  return session(filledSetup(), [
    leg('A', 1, samples),
    leg('B', 1, steady(60, 5, 10, 5)),
  ]);
}

function seaSession(): AbSession {
  const imu = [];
  for (let i = 0; i < 320; i++) {
    imu.push({
      tOffsetMs: AB_SETTLE_MS + i * 1000,
      pitchRad: (2 * Math.PI / 180) * Math.sin((2 * Math.PI * i) / 8),
    });
  }
  return session(filledSetup(), [
    leg('A', 1, steady(60, 6, 10, 5), [], imu),
    leg('B', 1, steady(60, 5, 10, 5)),
  ]);
}

function helmSamples(signedTwa: number, rudder: number, count = 8): AbSample[] {
  const samples: AbSample[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(point(AB_SETTLE_MS + i * 1000, {
      signedTwaDeg: signedTwa,
      rudderDeg: rudder,
      twaDeg: Math.abs(signedTwa),
    }));
  }
  return samples;
}

function helmSession(): AbSession {
  return session(filledSetup(), [
    leg('A', 1, helmSamples(40, -4)),
    leg('A', 2, helmSamples(40, -2)),
    leg('B', 1, helmSamples(40, 2)),
    leg('B', 2, helmSamples(40, 2)),
  ]);
}

function heaveSession(): AbSession {
  const imu = [];
  for (let i = 0; i < 320; i++) {
    imu.push({
      tOffsetMs: AB_SETTLE_MS + i * 1000,
      pitchRad: 0.0001,
      heaveM: 0.5 * Math.sin((2 * Math.PI * i) / 8),
    });
  }
  return session(filledSetup(), [
    leg('A', 1, steady(60, 6, 10, 5), [], imu),
    leg('B', 1, steady(60, 5, 10, 5)),
  ]);
}
