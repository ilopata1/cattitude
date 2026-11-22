import { windVmgKnots } from '../ab-test/ab-test';
import { SailPlan, SailPlanCell } from '../models/sail-plan.model';
import { NEAR_TWA_ENTER_DEG, NEAR_TWS_ENTER_KN } from '../services/sail-plan-advisor';
import { emptyEstimate, WaveEstimate } from '../waves/wave-estimator';
import { COACH_INPUT_ORDER } from './coach-inputs';
import { CoachAbRecord } from './coach-memory';
import { CoachFinding, CoachSnapshot, Stat } from './coach.model';
import { coachFindings } from './coach-rules';
import {
  COACH_NOSE_DIVE_ENABLED,
  COACH_VMG_DOWNWIND_TWA_DEG,
  GUST_OVER_BASE_FRACTION,
  GUST_OVER_BASE_KN,
  HEADING_SD_WORK_DEG,
  HELM_NOTABLE_DEG,
  HELM_SIGNIFICANT_DEG,
  MOTION_ACCEL_ELEVATED_MPS2,
  MOTION_PITCH_ELEVATED_DEG,
  POLAR_LOW_PCT,
  PRESSURE_NOTABLE_HPA,
  PRESSURE_STRONG_HPA,
  RUDDER_SD_ELEVATED_DEG,
  RUDDER_SD_HIGH_DEG,
  SURF_FINDING_COUNT,
  WATCH_HANDOVER_MIN,
  WAVE_STEEP,
} from './coach-settings';

export function coachRuleFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean | undefined, message: string) => {
    if (!condition) failures.push(message);
  };

  expect(COACH_NOSE_DIVE_ENABLED === false, 'nose-dive advice stays off until wave direction is confirmed');
  expect(coachFindings(base()).length === 0, `a quiet snapshot has no findings, got ${coachFindings(base()).map(item => item.id).join(', ')}`);

  const mismatch = tune(snap => {
    snap.sails.mismatch[30] = true;
    snap.sails.mismatch[60] = true;
    snap.sails.advice = advice({
      primary: 'Main 1st reef + jib',
      notes: 'Hold the reef.',
      avoid: 'avoid full main above 18 kn',
    });
  });
  const mismatchFinding = one(mismatch, 'sails.mismatch');
  expect(mismatchFinding?.severity === 'action', 'a 30 and 60 minute mismatch is an action');
  expect(
    mismatchFinding?.text.includes('Main 1st reef + jib')
      && mismatchFinding.text.includes('full main + jib is up (for 40 min)')
      && mismatchFinding.text.includes('Hold the reef.')
      && mismatchFinding.text.includes('avoid full main above 18 kn'),
    `mismatch text should quote the cell, got ${mismatchFinding?.text}`,
  );
  expect(!mismatch.some(item => item.id === 'sails.mismatch-short'), 'a long mismatch is not also the short note');
  expect(grounded(mismatchFinding), 'mismatch numbers are in the evidence');

  const short = tune(snap => { snap.sails.mismatch[15] = true; });
  expect(one(short, 'sails.mismatch-short')?.text.includes('40–70° at 12–18 kn'), 'the short note names the band');
  expect(!short.some(item => item.id === 'sails.mismatch'), '15 minutes alone is not an action');
  const neither = tune(snap => {
    snap.sails.mismatch[15] = true;
    snap.sails.mismatch[30] = true;
  });
  expect(!neither.some(item => item.id.startsWith('sails.mismatch')), '15 and 30 minutes is not yet a long mismatch');

  const cutover = scene(snap => {
    snap.wind.twsTrendKnPerHour = 4;
    snap.sails.nextCutover = { kind: 'tws', value: 20, distance: NEAR_TWS_ENTER_KN, approaching: true };
  });
  const near = coachFindings(cutover, { sailPlan: plan() });
  const nearFinding = one(near, 'sails.near-cutover');
  expect(nearFinding?.severity === 'prepare', 'an approaching cutover is prepare');
  expect(
    nearFinding?.text === 'True wind trending +4 kn/h towards the 20 kn cutover. Prepare for 1st reef.',
    `cutover text, got ${nearFinding?.text}`,
  );
  const unnamed = one(coachFindings(cutover), 'sails.near-cutover');
  expect(unnamed != null && !unnamed.text.includes('Prepare for'), 'without a sail plan the next sail is not invented');
  const far = scene(snap => {
    snap.sails.nextCutover = { kind: 'tws', value: 20, distance: NEAR_TWS_ENTER_KN + 0.1, approaching: true };
  });
  expect(!coachFindings(far).some(item => item.id === 'sails.near-cutover'), 'outside the enter band is not a near cutover');
  const angleCut = scene(snap => {
    snap.wind.twa.slopePerMin = 0.1;
    snap.sails.nextCutover = { kind: 'twa', value: 70, distance: NEAR_TWA_ENTER_DEG, approaching: true };
  });
  const angleFinding = one(coachFindings(angleCut, { sailPlan: plan() }), 'sails.near-cutover');
  expect(angleFinding?.text.includes('70°'), `angle cutover text, got ${angleFinding?.text}`);

  const gustAction = scene(snap => {
    snap.wind.gust10mKn = 25;
    snap.wind.gustSpreadKn = 1;
  });
  const gust = one(coachFindings(gustAction, { sailPlan: plan() }), 'sails.reef-gust-spread');
  expect(gust?.severity === 'action' && gust.direction === 'less-sail', 'gusts into the next band are an action to reduce sail');
  expect(gust?.text.includes('25 kn') && gust.text.includes('20 kn band'), `gust text, got ${gust?.text}`);
  const gustByKnots = scene(snap => {
    snap.wind.tws = stat(20);
    snap.wind.gust10mKn = 20 + GUST_OVER_BASE_KN + 0.2;
    snap.wind.gustSpreadKn = GUST_OVER_BASE_KN + 0.2;
  });
  const byKnots = one(coachFindings(gustByKnots, { sailPlan: plan() }), 'sails.reef-gust-spread');
  expect(
    byKnots?.severity === 'prepare' && byKnots.text.includes('5.2 kn above the mean'),
    `a gust more than 5 kn over the mean prepares, got ${byKnots?.text}`,
  );
  const gustByPercent = scene(snap => {
    snap.wind.tws = stat(10);
    snap.wind.gust10mKn = 14;
    snap.wind.gustSpreadKn = 4;
  });
  const byPercent = one(coachFindings(gustByPercent, { sailPlan: plan() }), 'sails.reef-gust-spread');
  expect(
    byPercent?.severity === 'prepare' && byPercent.text.includes('4 kn above the mean'),
    `a gust more than 30% over the mean prepares, got ${byPercent?.text}`,
  );
  expect(4 / 10 > GUST_OVER_BASE_FRACTION && 4 <= GUST_OVER_BASE_KN, 'the percent case stays inside the knot gate');
  const gustBandOnly = scene(snap => {
    snap.wind.tws = stat(18);
    snap.wind.gust10mKn = 20;
    snap.wind.gustSpreadKn = 2;
  });
  expect(
    !coachFindings(gustBandOnly, { sailPlan: plan() }).some(item => item.id === 'sails.reef-gust-spread'),
    'a gust that reaches the next band but is within 5 kn and 30% of the mean stays quiet',
  );
  const gustExactKnots = scene(snap => {
    snap.wind.tws = stat(20);
    snap.wind.gust10mKn = 20 + GUST_OVER_BASE_KN;
    snap.wind.gustSpreadKn = GUST_OVER_BASE_KN;
  });
  expect(
    !coachFindings(gustExactKnots, { sailPlan: plan() }).some(item => item.id === 'sails.reef-gust-spread'),
    'a gust exactly 5 kn over the mean stays quiet',
  );
  const gustExactPercent = scene(snap => {
    snap.wind.tws = stat(10);
    snap.wind.gust10mKn = 13;
    snap.wind.gustSpreadKn = 3;
  });
  expect(
    !coachFindings(gustExactPercent, { sailPlan: plan() }).some(item => item.id === 'sails.reef-gust-spread'),
    'a gust exactly 30% over the mean stays quiet',
  );

  const beforeDark = scene(snap => {
    snap.sails.nextCutover = { kind: 'tws', value: 20, distance: 10, approaching: true };
  });
  const dark = one(coachFindings(beforeDark, { minutesToNight: 50 }), 'sails.reef-before-dark');
  expect(dark?.direction === 'less-sail' && dark.text.includes('Reef before dark (50 min).'), `reef before dark, got ${dark?.text}`);
  const beforeWatch = scene(snap => {
    snap.sails.nextCutover = { kind: 'tws', value: 20, distance: 10, approaching: true };
    snap.outlook.minutesToWatchChange = 35;
  });
  expect(one(coachFindings(beforeWatch), 'sails.reef-before-dark')?.text.includes('Reef before the watch change in 35 min (Sam).'), 'reef before the watch change');
  const notSoon = scene(snap => {
    snap.sails.nextCutover = { kind: 'tws', value: 20, distance: 10, approaching: true };
    snap.outlook.minutesToWatchChange = 46;
  });
  expect(!coachFindings(notSoon, { minutesToNight: 61 }).some(item => item.id === 'sails.reef-before-dark'), 'night in 61 min and a watch in 46 min do not reef early');
  const noApproach = scene(snap => { snap.outlook.minutesToWatchChange = 10; });
  expect(!coachFindings(noApproach, { minutesToNight: 10 }).some(item => item.id === 'sails.reef-before-dark'), 'reef-before-dark needs an approaching cutover');

  const heavy = tune(snap => {
    snap.sails.advice = advice({
      primary: 'storm jib and trysail',
      avoid: 'avoid the full main',
      heavyWeather: true,
    });
  });
  const heavyFinding = one(heavy, 'sails.heavy-overlay');
  expect(heavyFinding?.severity === 'action', 'heavy weather is an action');
  expect(
    heavyFinding?.text.includes('storm jib and trysail') && heavyFinding.text.includes('avoid the full main'),
    `heavy weather restates the cell, got ${heavyFinding?.text}`,
  );
  expect(!/consider|maybe|perhaps|might|could/i.test(heavyFinding?.text ?? ''), 'heavy weather is not softened');
  const notHeavy = coachFindings(base());
  expect(!notHeavy.some(item => item.id === 'sails.heavy-overlay'), 'a normal cell is not heavy weather');

  const notable = tune(snap => { snap.helm.weatherHelmDeg = stat(HELM_NOTABLE_DEG); });
  const notableFinding = one(notable, 'balance.weather-helm');
  expect(notableFinding?.severity === 'info' && notableFinding.text.includes('4° of weather helm'), `notable helm, got ${notableFinding?.text}`);
  expect(!/heel|roll/i.test(notableFinding?.text ?? ''), 'a catamaran helm note does not use heel or roll');
  expect(!/daggerboard/i.test(notableFinding?.text ?? ''), 'no daggerboards means the lever is not named');
  const significant = tune(snap => { snap.helm.weatherHelmDeg = stat(HELM_SIGNIFICANT_DEG); });
  expect(one(significant, 'balance.weather-helm')?.severity === 'prepare', '7° of weather helm is prepare');
  const boards = tune(snap => {
    snap.helm.weatherHelmDeg = stat(HELM_SIGNIFICANT_DEG);
    snap.vessel.hasDaggerboards = true;
  });
  expect(/daggerboard/i.test(one(boards, 'balance.weather-helm')?.text ?? ''), 'daggerboards are named only when the boat has them');
  expect(!coachFindings(base()).some(item => item.id === 'balance.weather-helm'), '1° of helm stays quiet');

  const lee = tune(snap => { snap.helm.weatherHelmDeg = stat(-HELM_NOTABLE_DEG); });
  const leeFinding = one(lee, 'balance.lee-helm');
  expect(leeFinding?.text.includes('4° of lee helm') && leeFinding.text.includes('traveller up'), `lee helm, got ${leeFinding?.text}`);
  expect(!/larger headsail|more sail|shake out|unreef|hoist/i.test(leeFinding?.text ?? ''), 'lee helm does not ask for more sail');
  expect(!tune(snap => { snap.helm.weatherHelmDeg = stat(-HELM_NOTABLE_DEG + 1); }).some(item => item.id === 'balance.lee-helm'), 'under 4° of lee helm stays quiet');

  const highRudder = tune(snap => { snap.helm.rudderSdDeg = RUDDER_SD_HIGH_DEG; });
  const high = one(highRudder, 'balance.pilot-workload');
  expect(high?.severity === 'action' && high.direction === 'less-sail' && high.text.startsWith('Pilot working hard'), `high workload, got ${high?.text}`);
  const elevated = tune(snap => { snap.helm.rudderSdDeg = RUDDER_SD_ELEVATED_DEG; });
  const working = one(elevated, 'balance.pilot-workload');
  expect(working?.severity === 'prepare' && working.direction == null, 'elevated rudder is prepare without a less-sail mark');
  const wander = tune(snap => {
    snap.helm.rudderSdDeg = 2;
    snap.helm.headingSdDeg = HEADING_SD_WORK_DEG;
    snap.helm.autopilotEngaged = false;
  });
  const wandering = one(wander, 'balance.pilot-workload');
  expect(wandering?.text.startsWith('Helm working hard (heading ±10°)'), `heading wander, got ${wandering?.text}`);
  expect(!coachFindings(base()).some(item => item.id === 'balance.pilot-workload'), 'a steady helm is not workload');

  const low = tune(snap => { snap.performance.polarPct[30] = POLAR_LOW_PCT - 1; snap.performance.polarPct[60] = POLAR_LOW_PCT - 1; });
  expect(one(low, 'performance.low-polar')?.text.includes('30 min is 84% of polar and 60 min is 84%'), 'low polar names both windows');
  const oneWindow = tune(snap => { snap.performance.polarPct[30] = POLAR_LOW_PCT - 1; snap.performance.polarPct[60] = POLAR_LOW_PCT; });
  expect(!oneWindow.some(item => item.id === 'performance.low-polar'), 'one low window is not enough');
  const suspect = tune(snap => {
    snap.performance.sensorSuspect = true;
    snap.performance.stwSogResidualKn = 1.2;
    snap.performance.polarPct[30] = 70;
    snap.performance.polarPct[60] = 70;
  });
  expect(!suspect.some(item => item.id === 'performance.low-polar'), 'a suspect log does not suggest a sail or angle change');
  const sensor = one(suspect, 'performance.sensor-suspect');
  expect(sensor?.section === 'data' && sensor.text.includes('1.2 kn'), `sensor text, got ${sensor?.text}`);
  expect(!coachFindings(base()).some(item => item.id === 'performance.sensor-suspect'), 'a trusted log stays quiet');

  const rough = scene(snap => {
    snap.motion.rmsPitchDeg = MOTION_PITCH_ELEVATED_DEG;
    snap.waves = waveBlock({ dirTravelBow: 160, dirFromTrue: 200, hs: 1.8, tpTrue: 6, confidence: 'medium' });
  });
  const angle = one(coachFindings(rough, { polarTargetKn: () => 8 }), 'waves.angle');
  expect(angle?.confidence === 'medium', 'wave confidence is the estimate confidence');
  expect(angle?.evidence['place'] === 'quarter' && angle.evidence['headingChangeDeg'] === 25, `quarter heading, got ${JSON.stringify(angle?.evidence)}`);
  const expectedCost = round1(windVmgKnots(8, 60, 60 > COACH_VMG_DOWNWIND_TWA_DEG) - windVmgKnots(8, 85, 85 > COACH_VMG_DOWNWIND_TWA_DEG));
  expect(angle?.evidence['vmgCostKn'] === expectedCost, `VMG cost ${angle?.evidence['vmgCostKn']} vs ${expectedCost}`);
  expect(grounded(angle), 'wave numbers are in the evidence');
  const calm = tune(snap => {
    snap.motion.rmsPitchDeg = MOTION_PITCH_ELEVATED_DEG - 0.1;
    snap.waves = waveBlock({ confidence: 'medium' });
  });
  expect(!calm.some(item => item.id === 'waves.angle'), 'calm motion has no wave-angle note');
  const byAccel = tune(snap => {
    snap.motion.rmsPitchDeg = null;
    snap.motion.rmsAccelZ = MOTION_ACCEL_ELEVATED_MPS2;
    snap.waves = waveBlock({ confidence: 'high', dirTravelBow: 160, dirFromTrue: 200, hs: 1.8, tpTrue: 6 });
  });
  expect(one(byAccel, 'waves.angle')?.confidence === 'high', 'vertical acceleration can raise the wave note');

  const steep = tune(snap => { snap.waves = waveBlock({ confidence: 'medium' }, WAVE_STEEP); });
  expect(one(steep, 'waves.steep')?.severity === 'prepare', 'a steep sea is prepare');
  const flatter = tune(snap => { snap.waves = waveBlock({ confidence: 'medium' }, WAVE_STEEP - 0.001); });
  expect(!flatter.some(item => item.id === 'waves.steep'), 'under the steepness gate stays quiet');

  const ambiguous = tune(snap => {
    snap.waves = waveBlock({ ambiguous: true, confidence: 'low', dirFromTrue: null, dirTravelBow: null }, 0.08);
    snap.waves.usable = false;
    snap.pointOfSail = 'downwind';
    snap.performance.sog = stat(12);
  });
  expect(one(ambiguous, 'waves.unusable')?.text.includes('unresolved'), 'an ambiguous direction gives no angle advice');
  expect(!ambiguous.some(item => item.id === 'waves.angle' || item.id === 'downwind.nose-dive-margin'), 'ambiguous waves produce no angle and no nose-dive');
  const lowConfidence = tune(snap => {
    snap.waves = waveBlock({ confidence: 'low' });
    snap.waves.usable = false;
  });
  expect(one(lowConfidence, 'waves.unusable')?.text.includes('low confidence'), 'low confidence gives no angle advice');

  const surfing = tune(snap => {
    snap.pointOfSail = 'downwind';
    snap.downwind.speedExcursions = SURF_FINDING_COUNT;
    snap.downwind.maxStwKn = 21;
  });
  const surf = one(surfing, 'downwind.surf-conditions');
  expect(surf?.text === '3 surfs above target in 30 min, peak 21 kn.', `surf text, got ${surf?.text}`);
  expect(surfing.some(item => item.id === 'downwind.swell-caveat'), 'a downwind finding adds the swell caveat');
  const fewSurfs = tune(snap => {
    snap.pointOfSail = 'downwind';
    snap.downwind.speedExcursions = SURF_FINDING_COUNT - 1;
  });
  expect(!fewSurfs.some(item => item.id === 'downwind.surf-conditions' || item.id === 'downwind.swell-caveat'), 'two surfs stay quiet, including the caveat');

  const diving = scene(snap => {
    snap.pointOfSail = 'downwind';
    snap.performance.sog = stat(11);
    snap.waves = waveBlock({ confidence: 'medium' }, 0.04, 1.2, 18);
  });
  expect(!coachFindings(diving).some(item => item.id === 'downwind.nose-dive-margin'), 'nose-dive stays off by default');
  const dive = one(coachFindings(diving, { noseDiveEnabled: true }), 'downwind.nose-dive-margin');
  expect(dive?.severity === 'action' && dive.direction === 'less-sail', 'a confirmed nose-dive is an action to reduce sail');
  expect(coachFindings(diving, { noseDiveEnabled: true }).some(item => item.id === 'downwind.swell-caveat'), 'nose-dive adds the swell caveat');
  const longSea = scene(snap => {
    snap.pointOfSail = 'downwind';
    snap.performance.sog = stat(11);
    snap.waves = waveBlock({ confidence: 'medium' }, 0.04, 2.1, 18);
  });
  expect(!coachFindings(longSea, { noseDiveEnabled: true }).some(item => item.id === 'downwind.nose-dive-margin'), 'a long sea is not a nose-dive');

  const falling = tune(snap => { snap.outlook.pressureTrend3hHpa = PRESSURE_NOTABLE_HPA; });
  expect(one(falling, 'outlook.pressure')?.severity === 'prepare', '3 hPa down is prepare');
  const plunging = tune(snap => { snap.outlook.pressureTrend3hHpa = PRESSURE_STRONG_HPA; });
  expect(one(plunging, 'outlook.pressure')?.severity === 'action' && one(plunging, 'outlook.pressure')?.text.includes('6 hPa'), '6 hPa down is an action');
  expect(!coachFindings(base()).some(item => item.id === 'outlook.pressure'), '1 hPa down stays quiet');

  const handover = tune(snap => { snap.outlook.minutesToWatchChange = WATCH_HANDOVER_MIN; });
  expect(one(handover, 'outlook.watch-handover')?.text === 'Watch change in 20 min (Sam).', 'the handover names the next watch');
  const later = tune(snap => { snap.outlook.minutesToWatchChange = WATCH_HANDOVER_MIN + 1; });
  expect(!later.some(item => item.id === 'outlook.watch-handover'), '21 minutes is not a handover');

  const missingRudder = tune(snap => {
    snap.helm.weatherHelmDeg = stat(HELM_SIGNIFICANT_DEG);
    snap.helm.rudderSdDeg = RUDDER_SD_HIGH_DEG;
    mark(snap, 'rudder', 'missing');
  });
  expect(missingRudder.every(item => item.section === 'data'), `missing rudder produces only data caveats, got ${missingRudder.map(item => item.id).join(', ')}`);
  expect(missingRudder.some(item => item.id === 'data.missing.rudder'), 'missing rudder is named');
  expect(!missingRudder.some(item => item.id.startsWith('balance.')), 'missing rudder removes balance findings');

  const staleWind = tune(snap => {
    snap.wind.gustSpreadKn = 9;
    snap.wind.gust10mKn = 30;
    mark(snap, 'tws', 'stale');
  });
  expect(!staleWind.some(item => item.id === 'sails.reef-gust-spread'), 'stale wind does not produce a gust finding');
  expect(staleWind.every(item => item.section === 'data') && staleWind.some(item => item.id === 'data.stale.tws'), 'stale wind is only a data caveat');

  const ordered = tune(snap => {
    snap.sails.advice = advice({ primary: 'storm jib', heavyWeather: true });
    snap.outlook.pressureTrend3hHpa = PRESSURE_STRONG_HPA;
    snap.outlook.minutesToWatchChange = 10;
    snap.waves = waveBlock({ confidence: 'low', ambiguous: true });
    snap.waves.usable = false;
  });
  const ids = ordered.map(item => item.id);
  expect(ids.indexOf('sails.heavy-overlay') < ids.indexOf('outlook.pressure'), 'actions sort by section after severity');
  expect(ids.indexOf('outlook.pressure') < ids.indexOf('outlook.watch-handover'), 'an action comes before an info');
  expect(ids.indexOf('outlook.watch-handover') < ids.indexOf('waves.unusable'), 'higher confidence comes first');

  const moreSail = [...mismatch, ...lee, ...heavy].some(item => /shake out|unreef|larger headsail|more sail|\bhoist\b/i.test(item.text));
  expect(!moreSail, 'no finding recommends more sail than the sail plan cell');
  expect([...mismatch, ...heavy, ...lee, ...ordered].every(item => grounded(item) && !item.text.includes('!')), 'findings stay grounded and unexclaimed');

  const similar = coachFindings(base(), { abTests: [abRecord()] });
  const quoted = one(similar, 'performance.ab-evidence');
  expect(quoted?.text === 'In similar wind (21 Jun 2026), B (traveller down) beat A by 10% VMG at 80% confidence.', `similar wind quotes the test, got ${quoted?.text}`);
  expect(grounded(quoted), 'the quoted test keeps its numbers in evidence');
  const windFar = coachFindings(base(), { abTests: [abRecord({ meanTwsKn: 18 })] });
  expect(!windFar.some(item => item.id === 'performance.ab-evidence'), '4 kn away is not similar wind');
  const quietConfidence = coachFindings(base(), { abTests: [abRecord({ vmgConfidencePct: 69 })] });
  expect(!quietConfidence.some(item => item.id === 'performance.ab-evidence'), '69% confidence stays quiet');
  const staleTws = base();
  staleTws.dataHealth = staleTws.dataHealth.map(row => row.input === 'tws' ? { ...row, status: 'stale' } : row);
  expect(
    !coachFindings(staleTws, { abTests: [abRecord()] }).some(item => item.id === 'performance.ab-evidence'),
    'stale true wind speed does not quote a stored test',
  );

  return failures;
}

function abRecord(partial: Partial<CoachAbRecord> = {}): CoachAbRecord {
  return {
    id: 'test',
    finishedAt: Date.UTC(2026, 5, 21),
    settingA: 'traveller up',
    settingB: 'traveller down',
    meanTwsKn: 14,
    meanTwaDeg: 60,
    vmgWinner: 'B',
    vmgConfidencePct: 80,
    vmgDeltaPct: 10,
    ...partial,
  };
}

function one(findings: CoachFinding[], id: string): CoachFinding | undefined {
  return findings.find(item => item.id === id);
}

function grounded(item: CoachFinding | undefined): boolean {
  if (!item) return false;
  const values = Object.values(item.evidence).filter((value): value is number => typeof value === 'number');
  return (item.text.match(/-?\d+(?:\.\d+)?/g) ?? []).every(raw => values.includes(Number(raw)));
}

function scene(edit: (snapshot: CoachSnapshot) => void): CoachSnapshot {
  const snapshot = base();
  edit(snapshot);
  return snapshot;
}

function tune(edit: (snapshot: CoachSnapshot) => void): CoachFinding[] {
  return coachFindings(scene(edit));
}

function mark(snapshot: CoachSnapshot, input: string, status: 'stale' | 'missing'): void {
  const row = snapshot.dataHealth.find(item => item.input === input);
  if (row) row.status = status;
}

function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function base(): CoachSnapshot {
  return {
    builtAt: 1_000_000,
    vessel: {
      slug: 'cattitude',
      hullType: 'cat',
      hasDaggerboards: false,
      lWlM: 14,
      polarFile: 'outremer-55sc.pol',
    },
    windowMin: 30,
    isNight: false,
    pointOfSail: 'upwind',
    wind: {
      tws: stat(14),
      twa: stat(60),
      twd: stat(220),
      aws: stat(18),
      gust10mKn: 16,
      gustSpreadKn: 2,
      twsTrendKnPerHour: 0,
    },
    performance: {
      polarPct: { 15: 95, 30: 96, 60: 97 },
      targetKn: 8,
      stw: stat(8),
      sog: stat(8),
      vmgKn: 4,
      vmcKn: null,
      speedSource: 'stw',
      stwSogResidualKn: null,
      sensorSuspect: false,
    },
    helm: {
      weatherHelmDeg: stat(1),
      rudderSdDeg: 2,
      headingSdDeg: 2,
      autopilotEngaged: true,
      autopilotMode: 'auto',
    },
    motion: { rmsPitchDeg: 0, rmsRollDeg: 0, rmsAccelZ: null },
    waves: {
      estimate: null,
      ageMin: null,
      wavelengthM: null,
      phaseSpeedKn: null,
      lengthRatio: null,
      steepness: null,
      usable: false,
    },
    downwind: { speedExcursions: 0, maxStwKn: 8, maxOverTargetPct: 0 },
    sails: {
      up: 'full main + jib',
      upChangedAt: 1_000_000 - 40 * 60_000,
      advice: advice(),
      mismatch: { 15: false, 30: false, 60: false },
      nextCutover: null,
    },
    outlook: {
      pressureHpa: 1013,
      pressureTrend3hHpa: -1,
      nextWatchAt: null,
      nextWatchName: 'Sam',
      minutesToWatchChange: 90,
    },
    dataHealth: COACH_INPUT_ORDER.map(input => ({ input, status: 'ok' as const })),
  };
}

function advice(partial: Partial<CoachSnapshot['sails']['advice']> = {}): NonNullable<CoachSnapshot['sails']['advice']> {
  return {
    primary: 'full main + jib',
    alternatives: [],
    twaBand: { from: 40, to: 70 },
    twsBand: { from: 12, to: 18 },
    heavyWeather: false,
    nearCrossover: false,
    empty: false,
    ...partial,
  };
}

function plan(): SailPlan {
  const cell = (primary: string): SailPlanCell => ({ primary, alternatives: [] });
  return {
    name: 'test',
    sails: ['Main'],
    twaCuts: [0, 110, 180],
    twsCuts: [0, 20, 30],
    cells: [
      [cell('full main'), cell('1st reef'), cell('2nd reef')],
      [cell('gennaker'), cell('reef and gennaker'), cell('storm')],
    ],
    heavyWeather: { enabled: false, twsFrom: 35, twaCuts: [0, 180], cells: [] },
  };
}

function waveBlock(
  partial: Partial<WaveEstimate>,
  steepness = 0.03,
  lengthRatio = 4,
  phaseSpeedKn = 18,
): CoachSnapshot['waves'] {
  return {
    estimate: {
      ...emptyEstimate(''),
      status: 'ok',
      reason: '',
      flags: [],
      confidence: 'medium',
      ambiguous: false,
      hs: 1.8,
      tpTrue: 6,
      dirFromTrue: 200,
      dirTravelBow: 160,
      ...partial,
    },
    ageMin: 0,
    wavelengthM: 56,
    phaseSpeedKn,
    lengthRatio,
    steepness,
    usable: true,
  };
}

function stat(mean: number | null): Stat {
  return { mean, sd: 0, slopePerMin: 0, n: mean == null ? 0 : 3 };
}
