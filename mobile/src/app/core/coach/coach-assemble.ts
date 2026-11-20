/**
 * Fills a CoachSnapshot from values the phone already computed.
 * A window that is not covered contributes no mismatch and no advice.
 */

import { CurrentSailSelection, sailPlansDiffer } from '../guide/current-sail';
import { summarizeTrack } from '../logbook/logbook-math';
import { TrackSample as LogTrack } from '../models/logbook.model';
import { PolarWindowMinutes, PolarWindowSet } from '../models/polar.model';
import { SailPlan } from '../models/sail-plan.model';
import { adviseSailPlan } from '../services/sail-plan-advisor';
import { WaveEstimate } from '../waves/wave-estimator';
import { CurrentDrift, SurfSample } from './coach-features';
import { CoachAbRecord } from './coach-memory';
import { CoachInputHealth } from './coach-inputs';
import { CoachFinding, CoachSnapshot } from './coach.model';
import { coachFindings } from './coach-rules';
import { CoachSnapshotInput, CoachStreamSample, buildCoachSnapshot } from './coach-snapshot';
import { COACH_WINDOW_MIN } from './coach-settings';

export interface CoachAssembly {
  nowMs: number;
  samples: CoachStreamSample[];
  health: CoachInputHealth[];
  windows: PolarWindowSet;
  covered: Record<PolarWindowMinutes, boolean>;
  polarSamples: SurfSample[];
  targetKn: number | null;
  polarTargetKn: (twaDeg: number, twsKn: number) => number | null;
  wave: WaveEstimate | null;
  sailsUp: string;
  sailsChangedAt: number | null;
  selection: CurrentSailSelection;
  plan: SailPlan | null;
  position: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
  current: CurrentDrift | null;
  pressureHpa: number | null;
  track: LogTrack[];
  vessel: CoachSnapshot['vessel'];
  watch: { at: number; name: string; minutes: number } | null;
  minutesToNight: number | null;
  abTests?: readonly CoachAbRecord[];
}

export interface CoachAssemblyResult {
  snapshot: CoachSnapshot;
  findings: CoachFinding[];
}

export function assembleCoach(input: CoachAssembly): CoachAssemblyResult {
  const windowMin = COACH_WINDOW_MIN;
  const since = input.nowMs - 3 * 60 * 60_000;
  const summary = summarizeTrack(input.track, since, input.nowMs, input.pressureHpa);
  const adviceWindow = input.covered[30] ? input.windows[30] : input.covered[15] ? input.windows[15] : null;
  const advice = input.plan && adviceWindow
    ? adviseSailPlan(input.plan, adviceWindow.twaDeg, adviceWindow.twsKnots, adviceWindow.polarPct)
    : null;
  const snapshotInput: CoachSnapshotInput = {
    builtAt: input.nowMs,
    windowMin,
    vessel: input.vessel,
    position: input.position,
    destination: input.destination,
    samples: input.samples,
    dataHealth: input.health.map(row => ({ input: row.input, status: row.status })),
    polarPct: {
      15: input.covered[15] ? input.windows[15].polarPct : null,
      30: input.covered[30] ? input.windows[30].polarPct : null,
      60: input.covered[60] ? input.windows[60].polarPct : null,
    },
    targetKn: input.targetKn,
    gust10mKn: summary.gust10mKn,
    wave: input.wave,
    current: input.current,
    polarSamples: input.polarSamples,
    sailPlan: input.plan,
    sails: {
      up: input.sailsUp,
      upChangedAt: input.sailsChangedAt,
      advice,
      mismatch: {
        15: mismatch(input, 15),
        30: mismatch(input, 30),
        60: mismatch(input, 60),
      },
    },
    outlook: {
      pressureHpa: input.pressureHpa,
      pressureTrend3hHpa: summary.pressureTrend3hHpa,
      nextWatchAt: input.watch?.at ?? null,
      nextWatchName: input.watch?.name ?? null,
      minutesToWatchChange: input.watch?.minutes ?? null,
    },
  };
  const snapshot = buildCoachSnapshot(snapshotInput);
  const findings = coachFindings(snapshot, {
    polarTargetKn: input.polarTargetKn,
    sailPlan: input.plan,
    minutesToNight: input.minutesToNight,
    abTests: input.abTests ?? [],
  });
  return { snapshot, findings };
}

function mismatch(input: CoachAssembly, minutes: PolarWindowMinutes): boolean | null {
  if (!input.plan || !input.covered[minutes]) return null;
  const average = input.windows[minutes];
  const advice = adviseSailPlan(input.plan, average.twaDeg, average.twsKnots, average.polarPct);
  const recommended = advice && !advice.empty ? advice.primary : '';
  return sailPlansDiffer(input.selection, recommended, input.plan);
}
