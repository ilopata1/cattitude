import { SailPlan, SailPlanCell } from '../models/sail-plan.model';
import { emptyEstimate } from '../waves/wave-estimator';
import { coachBriefing } from './coach-briefing';
import { COACH_INPUT_ORDER } from './coach-inputs';
import { CoachSnapshot, Stat } from './coach.model';
import { coachFindings } from './coach-rules';
import {
  COACH_BRIEF_LONG_WORDS,
  COACH_BRIEF_SENTENCE_WORDS,
  COACH_BRIEF_SHORT_WORDS,
  COACH_WAVE_LENGTH_M_PER_S2,
  COACH_WAVE_PHASE_SPEED_KN_PER_S,
} from './coach-settings';

const BUILT_AT = Date.UTC(2026, 5, 21, 14, 20, 0);
const WATCH_AT = Date.UTC(2026, 5, 21, 15, 0, 0);

export function coachBriefingFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean | undefined, message: string) => {
    if (!condition) failures.push(message);
  };

  const snapshot = workedExample();
  const findings = coachFindings(snapshot, { sailPlan: plan(), minutesToNight: 50 });
  const brief = coachBriefing(snapshot, findings, { timeZone: 'UTC' });
  expect(brief.short === EXPECTED_SHORT, `short briefing\n${brief.short}`);
  expect(wordCount(brief.short) <= COACH_BRIEF_SHORT_WORDS, `short form is ${wordCount(brief.short)} words`);
  expect(wordCount(brief.long) <= COACH_BRIEF_LONG_WORDS, `long form is ${wordCount(brief.long)} words`);
  expect(sentences(brief.short).every(sentence => wordCount(sentence) <= COACH_BRIEF_SENTENCE_WORDS), overlong(brief.short));
  expect(sentences(brief.long).every(sentence => wordCount(sentence) <= COACH_BRIEF_SENTENCE_WORDS), overlong(brief.long));
  expect(!brief.short.includes('PERFORMANCE') && brief.long.includes('PERFORMANCE'), 'the long form keeps the polar figures');
  expect(brief.long.includes('96%') && brief.long.includes('94%'), 'polar windows are rounded to 1%');
  expect(brief.long.includes('BALANCE') && !brief.short.includes('BALANCE'), 'workload stays in the short bottom line');
  expect(!brief.short.includes('!') && !brief.long.includes('!'), 'no exclamation marks');
  expect(!/heel|roll/i.test(brief.short) && !/heel|roll/i.test(brief.long), 'a catamaran briefing does not use heel or roll');
  expect(!/shake out|unreef|larger headsail|more sail|\bhoist\b/i.test(brief.short), 'the briefing does not ask for more sail');

  const quiet = coachBriefing(bare(), [], { timeZone: 'UTC' });
  expect(
    quiet.short.includes('No change. Next decision point: none in the next few hours.'),
    `a quiet boat has no change, got ${quiet.short}`,
  );

  const missing = bare();
  missing.helm.weatherHelmDeg = stat(8);
  missing.helm.rudderSdDeg = 14;
  mark(missing, 'rudder', 'missing');
  const missingBrief = coachBriefing(missing, coachFindings(missing), { timeZone: 'UTC' });
  expect(
    !missingBrief.short.includes('missing') && !missingBrief.long.includes('missing'),
    `a missing rudder is left unsaid, got ${missingBrief.short}`,
  );
  expect(!missingBrief.short.includes('weather helm') && !missingBrief.short.includes('working hard'), 'missing rudder removes the balance advice');
  expect(missingBrief.long.includes('Polar 15 min 95%'), `polar figures are still stated, got ${missingBrief.long}`);

  const unresolved = bare();
  unresolved.waves = {
    estimate: { ...emptyEstimate(''), status: 'ok', ambiguous: true, confidence: 'low', dirFromTrue: null, dirTravelBow: null },
    ageMin: 0,
    wavelengthM: null,
    phaseSpeedKn: null,
    lengthRatio: null,
    steepness: null,
    usable: false,
  };
  const unresolvedBrief = coachBriefing(unresolved, coachFindings(unresolved), { timeZone: 'UTC' });
  expect(unresolvedBrief.short.includes('Wave direction is unresolved'), 'an unresolved sea is a caveat');
  expect(!unresolvedBrief.short.includes('heading change') && !unresolvedBrief.short.includes('bury-the-bows'), 'an unresolved sea gives no angle advice');

  return failures;
}

const EXPECTED_SHORT = [
  '14:20 · 30 min window · data OK (wave direction medium confidence)',
  '',
  'BOTTOM LINE',
  '1. Take the first reef before dark: gusts reach 25 kn and the plan says avoid full main above 18 kn.',
  '2. Pilot is working hard (rudder ±13°). Reefing should ease it; if not, bring the waves further onto the quarter.',
  '3. Brief Sam at the 15:00 handover: TWS rising about 4 kn an hour.',
  '',
  'SAIL PLAN  Plan for 16\u201320 kn at 120\u2013150°: Main 1st reef + gennaker. Up: full main + gennaker, mismatch for 40 min.',
  '',
  'DOWNWIND  5 surfs in 30 min, peak 21 kn. Waves 56 m long, travelling about 18 kn. Peak period may be swell, not the wind waves you surf.',
  '',
  'NEXT 1\u20133 H  If TWS holds above 20 kn, the plan moves to 2nd reef. Pressure steady (\u22122 hPa in 3 h).',
].join('\n');

function workedExample(): CoachSnapshot {
  const wavelength = COACH_WAVE_LENGTH_M_PER_S2 * 6 * 6;
  const phase = COACH_WAVE_PHASE_SPEED_KN_PER_S * 6;
  const snapshot = bare();
  snapshot.pointOfSail = 'downwind';
  snapshot.windowMin = 30;
  snapshot.wind.tws = stat(19);
  snapshot.wind.twa = stat(135);
  snapshot.wind.gust10mKn = 25;
  snapshot.wind.gustSpreadKn = 6;
  snapshot.wind.twsTrendKnPerHour = 4;
  snapshot.performance.polarPct = { 15: null, 30: 96, 60: 94 };
  snapshot.performance.targetKn = 8;
  snapshot.helm.weatherHelmDeg = stat(2);
  snapshot.helm.rudderSdDeg = 13;
  snapshot.helm.autopilotEngaged = true;
  snapshot.downwind.speedExcursions = 5;
  snapshot.downwind.maxStwKn = 21;
  snapshot.sails.up = 'full main + gennaker';
  snapshot.sails.upChangedAt = BUILT_AT - 40 * 60_000;
  snapshot.sails.mismatch = { 15: false, 30: true, 60: true };
  snapshot.sails.advice = {
    primary: 'Main 1st reef + gennaker',
    alternatives: [],
    notes: undefined,
    avoid: 'avoid full main above 18 kn',
    twaBand: { from: 120, to: 150 },
    twsBand: { from: 16, to: 20 },
    heavyWeather: false,
    nearCrossover: true,
    empty: false,
  };
  snapshot.sails.nextCutover = { kind: 'tws', value: 20, distance: 1, approaching: true };
  snapshot.outlook.pressureTrend3hHpa = -2;
  snapshot.outlook.nextWatchName = 'Sam';
  snapshot.outlook.nextWatchAt = WATCH_AT;
  snapshot.outlook.minutesToWatchChange = 40;
  snapshot.waves = {
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
    },
    ageMin: 0,
    wavelengthM: wavelength,
    phaseSpeedKn: phase,
    lengthRatio: wavelength / 14,
    steepness: 1.8 / wavelength,
    usable: true,
  };
  return snapshot;
}

function bare(): CoachSnapshot {
  return {
    builtAt: BUILT_AT,
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
      vmgKn: null,
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
    downwind: { speedExcursions: 0, maxStwKn: null, maxOverTargetPct: null },
    sails: {
      up: '',
      upChangedAt: null,
      advice: null,
      mismatch: { 15: false, 30: false, 60: false },
      nextCutover: null,
    },
    outlook: {
      pressureHpa: 1013,
      pressureTrend3hHpa: null,
      nextWatchAt: null,
      nextWatchName: null,
      minutesToWatchChange: null,
    },
    dataHealth: COACH_INPUT_ORDER.map(input => ({ input, status: 'ok' as const })),
  };
}

function plan(): SailPlan {
  const cell = (primary: string): SailPlanCell => ({ primary, alternatives: [] });
  return {
    name: 'test',
    sails: ['Main', 'Gennaker'],
    twaCuts: [0, 120, 150, 180],
    twsCuts: [0, 16, 20, 30],
    cells: [
      [cell('full main'), cell('full main'), cell('1st reef'), cell('2nd reef')],
      [cell('gennaker'), cell('Main 1st reef + gennaker'), cell('2nd reef'), cell('storm')],
      [cell('gennaker deep'), cell('reefed deep'), cell('2nd reef deep'), cell('storm deep')],
    ],
    heavyWeather: { enabled: false, twsFrom: 35, twaCuts: [0, 180], cells: [] },
  };
}

function mark(snapshot: CoachSnapshot, input: string, status: 'missing' | 'stale'): void {
  const row = snapshot.dataHealth.find(item => item.input === input);
  if (row) row.status = status;
}

function stat(mean: number | null): Stat {
  return { mean, sd: 0, slopePerMin: 0, n: mean == null ? 0 : 3 };
}

function sentences(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^\d+\.\s+/, '');
    for (const piece of line.split(/(?<=[.])\s+/)) {
      const sentence = piece.trim();
      if (sentence) out.push(sentence);
    }
  }
  return out;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(word => word && word !== '·').length;
}

function overlong(text: string): string {
  const long = sentences(text).filter(sentence => wordCount(sentence) > COACH_BRIEF_SENTENCE_WORDS);
  return long.length ? `sentence over 25 words: ${long.join(' | ')}` : 'sentences stay within 25 words';
}
