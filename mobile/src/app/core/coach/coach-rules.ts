/**
 * Turns a CoachSnapshot into findings. A missing or stale input produces a
 * data caveat and the rule that needed it stays silent. Numbers in each
 * sentence are copied from that finding's evidence.
 *
 * The three-item bottom line is the briefing's job. This list keeps every finding.
 * Nose-dive stays off until `COACH_NOSE_DIVE_ENABLED` is turned on.
 */

import { windVmgKnots } from '../ab-test/ab-test';
import { SailPlan, bandsFromCuts } from '../models/sail-plan.model';
import { findBandIndex, NEAR_TWA_ENTER_DEG, NEAR_TWS_ENTER_KN } from '../services/sail-plan-advisor';
import { CoachFinding, CoachSection, CoachSnapshot, Confidence } from './coach.model';
import { COACH_INPUT_LABELS, CoachInputId } from './coach-inputs';
import {
  COACH_NOSE_DIVE_ENABLED,
  COACH_VMG_DOWNWIND_TWA_DEG,
  GUST_SPREAD_KN,
  HEADING_SD_WORK_DEG,
  HELM_NOTABLE_DEG,
  HELM_SIGNIFICANT_DEG,
  MOTION_ACCEL_ELEVATED_MPS2,
  MOTION_PITCH_ELEVATED_DEG,
  NOSE_DIVE_LENGTH_MAX,
  NOSE_DIVE_LENGTH_MIN,
  NOSE_DIVE_SPEED_FRACTION,
  NOSE_DIVE_STEEPNESS,
  POLAR_LOW_PCT,
  PRESSURE_NOTABLE_HPA,
  PRESSURE_STRONG_HPA,
  REEF_BEFORE_DARK_MIN,
  REEF_BEFORE_WATCH_MIN,
  RUDDER_SD_ELEVATED_DEG,
  RUDDER_SD_HIGH_DEG,
  SURF_FINDING_COUNT,
  WATCH_HANDOVER_MIN,
  WAVE_HEADING_MIN_DEG,
  WAVE_QUARTER_DEG,
  WAVE_STEEP,
} from './coach-settings';

export interface CoachRulesOptions {
  /** Target boat speed at a true wind angle and speed. Omitted means no VMG cost is stated. */
  polarTargetKn?: (twaDeg: number, twsKn: number) => number | null;
  /** Used to name the sail combination on the far side of a cutover. */
  sailPlan?: SailPlan | null;
  /** Minutes until the sun is far enough down to call it night. */
  minutesToNight?: number | null;
  /** Overrides the nose-dive default for a caller that has confirmed wave direction. */
  noseDiveEnabled?: boolean;
}

const SEVERITY_RANK = { action: 0, prepare: 1, info: 2 };
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2, none: 3 };
const SECTION_RANK: Record<CoachSection, number> = {
  sails: 0,
  balance: 1,
  performance: 2,
  waves: 3,
  downwind: 4,
  outlook: 5,
  data: 6,
};

export function coachFindings(snapshot: CoachSnapshot, options: CoachRulesOptions = {}): CoachFinding[] {
  const noseDive = options.noseDiveEnabled ?? COACH_NOSE_DIVE_ENABLED;
  const findings = [
    sailsMismatch(snapshot),
    sailsMismatchShort(snapshot),
    sailsNearCutover(snapshot, options.sailPlan ?? null),
    sailsGust(snapshot, options.sailPlan ?? null),
    sailsReefBeforeDark(snapshot, options.minutesToNight ?? null),
    sailsHeavy(snapshot),
    balanceWeatherHelm(snapshot),
    balanceLeeHelm(snapshot),
    balanceWorkload(snapshot),
    performanceLowPolar(snapshot),
    performanceSensor(snapshot),
    wavesAngle(snapshot, options.polarTargetKn),
    wavesSteep(snapshot),
    wavesUnusable(snapshot),
    downwindSurf(snapshot),
    downwindNoseDive(snapshot, noseDive),
    outlookPressure(snapshot),
    outlookWatch(snapshot),
    ...dataCaveats(snapshot),
  ].filter((finding): finding is CoachFinding => finding != null);

  if (findings.some(finding => finding.section === 'downwind')) {
    findings.push(swellCaveat());
  }
  findings.sort(compareFindings);
  return findings;
}

function sailsMismatch(snapshot: CoachSnapshot): CoachFinding | null {
  if (!ready(snapshot, ['sails'])) return null;
  const mismatch = snapshot.sails.mismatch;
  if (mismatch[30] !== true || mismatch[60] !== true) return null;
  const advice = snapshot.sails.advice;
  const up = snapshot.sails.up.trim();
  if (!advice || advice.empty || !advice.primary.trim() || !up) return null;
  const minutes = minutesUp(snapshot);
  const base = minutes == null
    ? `Sail plan recommends ${advice.primary.trim()} for this band; ${up} is up.`
    : `Sail plan recommends ${advice.primary.trim()} for this band; ${up} is up (for ${minutes} min).`;
  const extra = [advice.notes?.trim(), avoidSentence(advice.avoid)].filter(Boolean).join(' ');
  const text = extra ? `${base} ${extra}` : base;
  return finding({
    id: 'sails.mismatch',
    section: 'sails',
    severity: 'action',
    confidence: 'high',
    text,
    evidence: evidenceOf({ recommended: advice.primary.trim(), up, ...(minutes == null ? {} : { minutes }) }),
    requires: ['sails'],
  });
}

function sailsMismatchShort(snapshot: CoachSnapshot): CoachFinding | null {
  if (!ready(snapshot, ['sails'])) return null;
  const mismatch = snapshot.sails.mismatch;
  if (mismatch[15] !== true || mismatch[30] === true || mismatch[60] === true) return null;
  const advice = snapshot.sails.advice;
  if (!advice || advice.empty) return null;
  const band = `${advice.twaBand.from}–${advice.twaBand.to}° at ${advice.twsBand.from}–${advice.twsBand.to} kn`;
  return finding({
    id: 'sails.mismatch-short',
    section: 'sails',
    severity: 'info',
    confidence: 'high',
    text: `Recently moved into the ${band} band; hold if it's a shift.`,
    evidence: {
      twaFrom: advice.twaBand.from,
      twaTo: advice.twaBand.to,
      twsFrom: advice.twsBand.from,
      twsTo: advice.twsBand.to,
    },
    requires: ['sails'],
  });
}

function sailsNearCutover(snapshot: CoachSnapshot, plan: SailPlan | null): CoachFinding | null {
  if (!ready(snapshot, ['tws', 'twa'])) return null;
  const cutover = snapshot.sails.nextCutover;
  const tws = snapshot.wind.tws.mean;
  const twa = snapshot.wind.twa.mean;
  if (!cutover?.approaching || tws == null || twa == null) return null;
  const enter = cutover.kind === 'tws' ? NEAR_TWS_ENTER_KN : NEAR_TWA_ENTER_DEG;
  if (!(cutover.distance <= enter)) return null;
  const next = nextPrimary(plan, twa, tws, cutover);
  const trend = cutoverTrend(snapshot, cutover, twa, tws);
  const value = cutover.kind === 'tws' ? `${shown(cutover.value)} kn` : `${shown(cutover.value)}°`;
  const rate = cutover.kind === 'tws' ? 'kn/h' : '°/h';
  const moving = trend == null
    ? `True wind is moving towards the ${value} cutover.`
    : `True wind trending ${signed(trend)} ${rate} towards the ${value} cutover.`;
  const prepare = next ? ` Prepare for ${next}.` : '';
  return finding({
    id: 'sails.near-cutover',
    section: 'sails',
    severity: 'prepare',
    confidence: 'high',
    text: `${moving}${prepare}`,
    evidence: evidenceOf({
      cutover: shown(cutover.value),
      distance: shown(cutover.distance),
      ...(trend == null ? {} : { trendPerHour: trend }),
      ...(next ? { next } : {}),
    }),
    requires: ['tws', 'twa'],
  });
}

function sailsGust(snapshot: CoachSnapshot, plan: SailPlan | null): CoachFinding | null {
  if (!ready(snapshot, ['tws'])) return null;
  const spread = snapshot.wind.gustSpreadKn;
  const gust = snapshot.wind.gust10mKn;
  const tws = snapshot.wind.tws.mean;
  const nextCut = nextHigherTwsCut(plan, tws, snapshot);
  const reaches = gust != null && nextCut != null && gust >= nextCut;
  const wide = spread != null && spread >= GUST_SPREAD_KN;
  if (!reaches && !wide) return null;
  const text = reaches
    ? `Gusts of ${shown(gust!)} kn reach the ${shown(nextCut!)} kn band; set the sail for the gusts, not the mean.`
    : `Gusts are ${shown(spread!)} kn above the mean; set the sail for the gusts, not the mean.`;
  return finding({
    id: 'sails.reef-gust-spread',
    section: 'sails',
    severity: reaches ? 'action' : 'prepare',
    confidence: 'high',
    text,
    evidence: evidenceOf(reaches
      ? { gustKn: shown(gust!), nextCutKn: shown(nextCut!) }
      : { gustSpreadKn: shown(spread!) }),
    requires: ['tws'],
    direction: 'less-sail',
  });
}

function sailsReefBeforeDark(snapshot: CoachSnapshot, minutesToNight: number | null): CoachFinding | null {
  const cutover = snapshot.sails.nextCutover;
  if (!cutover?.approaching) return null;
  const nightSoon = snapshot.isNight || (minutesToNight != null && minutesToNight <= REEF_BEFORE_DARK_MIN);
  const watchMin = snapshot.outlook.minutesToWatchChange;
  const watchSoon = watchMin != null && watchMin <= REEF_BEFORE_WATCH_MIN;
  if (!nightSoon && !watchSoon) return null;
  const parts: string[] = [];
  const evidence: Record<string, number | string | boolean> = {};
  if (nightSoon) {
    parts.push(minutesToNight != null && !snapshot.isNight
      ? `Reef before dark (${shown(minutesToNight, 0)} min).`
      : 'Reef before dark.');
    if (minutesToNight != null && !snapshot.isNight) evidence['minutesToNight'] = shown(minutesToNight, 0);
  }
  if (watchSoon && watchMin != null) {
    const name = snapshot.outlook.nextWatchName?.trim();
    parts.push(name
      ? `Reef before the watch change in ${shown(watchMin, 0)} min (${name}).`
      : `Reef before the watch change in ${shown(watchMin, 0)} min.`);
    evidence['minutesToWatchChange'] = shown(watchMin, 0);
    if (name) evidence['watchName'] = name;
  }
  return finding({
    id: 'sails.reef-before-dark',
    section: 'sails',
    severity: 'prepare',
    confidence: 'high',
    text: parts.join(' '),
    evidence,
    requires: [],
    direction: 'less-sail',
  });
}

function sailsHeavy(snapshot: CoachSnapshot): CoachFinding | null {
  if (!ready(snapshot, ['sails'])) return null;
  const advice = snapshot.sails.advice;
  if (!advice?.heavyWeather) return null;
  const words = [advice.primary.trim(), advice.notes?.trim(), avoidSentence(advice.avoid)].filter(Boolean).join(' ');
  const text = words || 'Heavy weather sail plan is in force.';
  return finding({
    id: 'sails.heavy-overlay',
    section: 'sails',
    severity: 'action',
    confidence: 'high',
    text,
    evidence: evidenceOf({
      ...(advice.primary.trim() ? { primary: advice.primary.trim() } : {}),
    }),
    requires: ['sails'],
  });
}

function balanceWeatherHelm(snapshot: CoachSnapshot): CoachFinding | null {
  if (!ready(snapshot, ['rudder', 'twa'])) return null;
  const helm = snapshot.helm.weatherHelmDeg?.mean;
  if (helm == null || !(helm >= HELM_NOTABLE_DEG)) return null;
  const notable = helm >= HELM_SIGNIFICANT_DEG;
  return finding({
    id: 'balance.weather-helm',
    section: 'balance',
    severity: notable ? 'prepare' : 'info',
    confidence: 'high',
    text: `${shown(helm)}° of weather helm. ${helmLevers(snapshot, 'weather')}`,
    evidence: { helmDeg: shown(helm) },
    requires: ['rudder', 'twa'],
  });
}

function balanceLeeHelm(snapshot: CoachSnapshot): CoachFinding | null {
  if (!ready(snapshot, ['rudder', 'twa'])) return null;
  const helm = snapshot.helm.weatherHelmDeg?.mean;
  if (helm == null || !(helm <= -HELM_NOTABLE_DEG)) return null;
  return finding({
    id: 'balance.lee-helm',
    section: 'balance',
    severity: 'info',
    confidence: 'high',
    text: `${shown(Math.abs(helm))}° of lee helm. ${helmLevers(snapshot, 'lee')}`,
    evidence: { helmDeg: shown(helm) },
    requires: ['rudder', 'twa'],
  });
}

function balanceWorkload(snapshot: CoachSnapshot): CoachFinding | null {
  const rudder = ready(snapshot, ['rudder']) ? snapshot.helm.rudderSdDeg : null;
  const heading = ready(snapshot, ['heading']) ? snapshot.helm.headingSdDeg : null;
  const high = rudder != null && rudder >= RUDDER_SD_HIGH_DEG;
  const elevated = rudder != null && rudder >= RUDDER_SD_ELEVATED_DEG;
  const wandering = heading != null && heading >= HEADING_SD_WORK_DEG;
  if (!high && !elevated && !wandering) return null;
  const who = snapshot.helm.autopilotEngaged === true ? 'Pilot' : 'Helm';
  const detail = rudder != null && (high || elevated)
    ? `${who} working hard (rudder ±${shown(rudder)}°).`
    : `${who} working hard (heading ±${shown(heading!)}°).`;
  return finding({
    id: 'balance.pilot-workload',
    section: 'balance',
    severity: high ? 'action' : 'prepare',
    confidence: 'high',
    text: `${detail} Usually overpowered or sea on the quarter: depower or change angle.`,
    evidence: evidenceOf({
      ...(rudder != null && (high || elevated) ? { rudderSdDeg: shown(rudder) } : {}),
      ...(rudder == null && heading != null ? { headingSdDeg: shown(heading) } : {}),
    }),
    requires: rudder != null && (high || elevated) ? ['rudder'] : ['heading'],
    ...(high ? { direction: 'less-sail' as const } : {}),
  });
}

function performanceLowPolar(snapshot: CoachSnapshot): CoachFinding | null {
  if (snapshot.performance.sensorSuspect) return null;
  if (!ready(snapshot, ['tws', 'twa'])) return null;
  if (snapshot.performance.speedSource == null) return null;
  const half = snapshot.performance.polarPct[30];
  const hour = snapshot.performance.polarPct[60];
  if (half == null || hour == null || !(half < POLAR_LOW_PCT) || !(hour < POLAR_LOW_PCT)) return null;
  return finding({
    id: 'performance.low-polar',
    section: 'performance',
    severity: 'info',
    confidence: 'high',
    text: `30 min is ${shown(half, 0)}% of polar and 60 min is ${shown(hour, 0)}%. Check sail plan alternatives or a hotter or lower angle.`,
    evidence: { polar30: shown(half, 0), polar60: shown(hour, 0) },
    requires: ['tws', 'twa'],
  });
}

function performanceSensor(snapshot: CoachSnapshot): CoachFinding | null {
  if (!snapshot.performance.sensorSuspect) return null;
  if (!ready(snapshot, ['stw', 'sog', 'current'])) return null;
  const residual = snapshot.performance.stwSogResidualKn;
  if (residual == null) return null;
  return finding({
    id: 'performance.sensor-suspect',
    section: 'data',
    severity: 'info',
    confidence: 'high',
    text: `Speed through water and speed over ground disagree by ${shown(residual)} kn after current; polar % may be wrong.`,
    evidence: { residualKn: shown(residual) },
    requires: ['stw', 'sog', 'current'],
  });
}

function wavesAngle(
  snapshot: CoachSnapshot,
  polarTargetKn: CoachRulesOptions['polarTargetKn'],
): CoachFinding | null {
  const waves = snapshot.waves;
  const estimate = waves.estimate;
  if (!waves.usable || !estimate || estimate.ambiguous) return null;
  if (estimate.confidence !== 'high' && estimate.confidence !== 'medium') return null;
  if (snapshot.pointOfSail == null) return null;
  const pitch = ready(snapshot, ['attitude']) ? snapshot.motion.rmsPitchDeg : null;
  const accel = ready(snapshot, ['accelZ']) ? snapshot.motion.rmsAccelZ : null;
  const pitchUp = pitch != null && pitch >= MOTION_PITCH_ELEVATED_DEG;
  const accelUp = accel != null && accel >= MOTION_ACCEL_ELEVATED_MPS2;
  if (!pitchUp && !accelUp) return null;
  if (estimate.dirFromTrue == null || estimate.dirTravelBow == null) return null;
  if (estimate.hs == null || estimate.tpTrue == null || waves.wavelengthM == null) return null;
  const relative = Math.abs(signed180(estimate.dirTravelBow));
  const twa = snapshot.wind.twa.mean;
  const tws = snapshot.wind.tws.mean;
  const choice = twa == null ? null : headingChoice(estimate.dirTravelBow, twa);
  let vmgCost: number | null = null;
  if (choice && polarTargetKn && twa != null && tws != null && snapshot.performance.targetKn != null) {
    const altSpeed = polarTargetKn(choice.altTwa, tws);
    if (altSpeed != null && Number.isFinite(altSpeed)) {
      const current = windVmgKnots(snapshot.performance.targetKn, twa, twa > COACH_VMG_DOWNWIND_TWA_DEG);
      const next = windVmgKnots(altSpeed, choice.altTwa, choice.altTwa > COACH_VMG_DOWNWIND_TWA_DEG);
      vmgCost = shown(current - next);
    }
  }
  const ratio = waves.lengthRatio;
  const sea = `Waves from ${shown(estimate.dirFromTrue, 0)}° true (${shown(relative, 0)}° relative), height ${shown(estimate.hs)} m, period ${shown(estimate.tpTrue)} s, wavelength ${shown(waves.wavelengthM, 0)} m`;
  const ratioText = ratio == null ? '.' : ` (${shown(ratio)} times the waterline).`;
  const turn = choice == null
    ? ''
    : ` A ${shown(Math.abs(choice.headingChangeDeg), 0)}° heading change puts them on the ${choice.place}.`;
  const cost = vmgCost == null ? '' : ` VMG cost ≈ ${shown(vmgCost)} kn.`;
  return finding({
    id: 'waves.angle',
    section: 'waves',
    severity: 'info',
    confidence: estimate.confidence,
    text: `${sea}${ratioText}${turn}${cost}`,
    evidence: evidenceOf({
      dirFromTrue: shown(estimate.dirFromTrue, 0),
      relativeDeg: shown(relative, 0),
      hsM: shown(estimate.hs),
      tpS: shown(estimate.tpTrue),
      wavelengthM: shown(waves.wavelengthM, 0),
      ...(ratio == null ? {} : { lengthRatio: shown(ratio) }),
      ...(choice == null ? {} : {
        headingChangeDeg: shown(Math.abs(choice.headingChangeDeg), 0),
        place: choice.place,
      }),
      ...(vmgCost == null ? {} : { vmgCostKn: shown(vmgCost) }),
    }),
    requires: pitchUp ? ['attitude'] : ['accelZ'],
  });
}

function wavesSteep(snapshot: CoachSnapshot): CoachFinding | null {
  const estimate = snapshot.waves.estimate;
  if (!snapshot.waves.usable || !estimate || estimate.ambiguous) return null;
  const steepness = snapshot.waves.steepness;
  if (steepness == null || !(steepness >= WAVE_STEEP)) return null;
  return finding({
    id: 'waves.steep',
    section: 'waves',
    severity: 'prepare',
    confidence: estimate.confidence === 'high' || estimate.confidence === 'medium' ? estimate.confidence : 'low',
    text: `Short steep sea (steepness ${shown(steepness, 3)}); ease the bow loading, reduce speed into it.`,
    evidence: { steepness: shown(steepness, 3) },
    requires: [],
  });
}

function wavesUnusable(snapshot: CoachSnapshot): CoachFinding | null {
  const estimate = snapshot.waves.estimate;
  if (!estimate || snapshot.waves.usable) return null;
  const unresolved = estimate.ambiguous;
  return finding({
    id: 'waves.unusable',
    section: 'data',
    severity: 'info',
    confidence: estimate.confidence,
    text: unresolved
      ? 'Wave direction is unresolved; no angle advice.'
      : 'Wave direction is low confidence; no angle advice.',
    evidence: { ambiguous: estimate.ambiguous },
    requires: [],
  });
}

function downwindSurf(snapshot: CoachSnapshot): CoachFinding | null {
  if (snapshot.pointOfSail !== 'downwind') return null;
  if (!ready(snapshot, ['twa'])) return null;
  const count = snapshot.downwind.speedExcursions;
  if (count == null || !(count >= SURF_FINDING_COUNT)) return null;
  const peak = snapshot.downwind.maxStwKn;
  const text = peak == null
    ? `${shown(count, 0)} surfs above target in ${snapshot.windowMin} min.`
    : `${shown(count, 0)} surfs above target in ${snapshot.windowMin} min, peak ${shown(peak)} kn.`;
  return finding({
    id: 'downwind.surf-conditions',
    section: 'downwind',
    severity: 'prepare',
    confidence: 'high',
    text,
    evidence: evidenceOf({
      surfs: shown(count, 0),
      windowMin: snapshot.windowMin,
      ...(peak == null ? {} : { peakKn: shown(peak) }),
    }),
    requires: ['twa'],
  });
}

function downwindNoseDive(snapshot: CoachSnapshot, enabled: boolean): CoachFinding | null {
  if (!enabled) return null;
  if (snapshot.pointOfSail !== 'downwind') return null;
  if (!ready(snapshot, ['sog', 'twa'])) return null;
  const waves = snapshot.waves;
  const estimate = waves.estimate;
  if (!waves.usable || !estimate || estimate.ambiguous) return null;
  const ratio = waves.lengthRatio;
  const sog = snapshot.performance.sog.mean;
  const phase = waves.phaseSpeedKn;
  const steepness = waves.steepness;
  if (ratio == null || sog == null || phase == null || steepness == null) return null;
  if (!(ratio >= NOSE_DIVE_LENGTH_MIN) || !(ratio <= NOSE_DIVE_LENGTH_MAX)) return null;
  if (!(sog >= phase * NOSE_DIVE_SPEED_FRACTION)) return null;
  if (!(steepness >= NOSE_DIVE_STEEPNESS)) return null;
  return finding({
    id: 'downwind.nose-dive-margin',
    section: 'downwind',
    severity: 'action',
    confidence: estimate.confidence === 'high' || estimate.confidence === 'medium' ? estimate.confidence : 'low',
    text: `Wave length is ${shown(ratio)} times the boat and speed is ${shown(sog)} kn against a ${shown(phase)} kn wave (steepness ${shown(steepness, 3)}). Bury-the-bows risk. Depower before speed rises; steer across rather than straight down.`,
    evidence: {
      lengthRatio: shown(ratio),
      sogKn: shown(sog),
      phaseSpeedKn: shown(phase),
      steepness: shown(steepness, 3),
    },
    requires: ['sog', 'twa'],
    direction: 'less-sail',
  });
}

function swellCaveat(): CoachFinding {
  return finding({
    id: 'downwind.swell-caveat',
    section: 'data',
    severity: 'info',
    confidence: 'high',
    text: 'Peak period may be swell rather than the wind waves the boat surfs.',
    evidence: {},
    requires: [],
  });
}

function outlookPressure(snapshot: CoachSnapshot): CoachFinding | null {
  if (!ready(snapshot, ['pressure'])) return null;
  const trend = snapshot.outlook.pressureTrend3hHpa;
  if (trend == null || !(trend <= PRESSURE_NOTABLE_HPA)) return null;
  const strong = trend <= PRESSURE_STRONG_HPA;
  return finding({
    id: 'outlook.pressure',
    section: 'outlook',
    severity: strong ? 'action' : 'prepare',
    confidence: 'high',
    text: `Pressure down ${shown(Math.abs(trend))} hPa in 3 h.`,
    evidence: { dropHpa: shown(Math.abs(trend)) },
    requires: ['pressure'],
  });
}

function outlookWatch(snapshot: CoachSnapshot): CoachFinding | null {
  const minutes = snapshot.outlook.minutesToWatchChange;
  if (minutes == null || !(minutes <= WATCH_HANDOVER_MIN)) return null;
  const name = snapshot.outlook.nextWatchName?.trim();
  return finding({
    id: 'outlook.watch-handover',
    section: 'outlook',
    severity: 'info',
    confidence: 'high',
    text: name
      ? `Watch change in ${shown(minutes, 0)} min (${name}).`
      : `Watch change in ${shown(minutes, 0)} min.`,
    evidence: evidenceOf({
      minutesToWatchChange: shown(minutes, 0),
      ...(name ? { watchName: name } : {}),
    }),
    requires: [],
  });
}

function dataCaveats(snapshot: CoachSnapshot): CoachFinding[] {
  const seen = new Set<string>();
  const out: CoachFinding[] = [];
  for (const row of snapshot.dataHealth) {
    if (row.status === 'ok' || seen.has(row.input)) continue;
    seen.add(row.input);
    const label = labelFor(row.input);
    out.push(finding({
      id: `data.${row.status}.${row.input}`,
      section: 'data',
      severity: 'info',
      confidence: 'high',
      text: row.status === 'missing' ? `${label} is missing.` : `${label} is stale.`,
      evidence: { input: row.input, status: row.status },
      requires: [row.input],
    }));
  }
  return out;
}

function helmLevers(snapshot: CoachSnapshot, side: 'weather' | 'lee'): string {
  const levers = side === 'weather'
    ? 'Levers: traveller down, ease the main, smaller headsail.'
    : 'Levers: traveller up, trim the main.';
  if (snapshot.vessel.hasDaggerboards !== true) return levers;
  return `${levers} A daggerboard adjustment is one of the levers.`;
}

function headingChoice(
  dirTravelBow: number,
  twa: number,
): { headingChangeDeg: number; place: 'bow' | 'quarter'; altTwa: number } | null {
  const rel = signed180(dirTravelBow);
  const side = rel === 0 ? 1 : Math.sign(rel);
  const candidates = [
    { place: 'bow' as const, target: 0 },
    { place: 'quarter' as const, target: side * WAVE_QUARTER_DEG },
  ].map(candidate => {
    const headingChangeDeg = signed180(rel - candidate.target);
    return {
      place: candidate.place,
      headingChangeDeg,
      altTwa: clamp(Math.abs(twa + headingChangeDeg), 0, 180),
    };
  }).filter(candidate => Math.abs(candidate.headingChangeDeg) >= WAVE_HEADING_MIN_DEG);
  candidates.sort((a, b) => Math.abs(a.headingChangeDeg) - Math.abs(b.headingChangeDeg));
  return candidates[0] ?? null;
}

function cutoverTrend(
  snapshot: CoachSnapshot,
  cutover: NonNullable<CoachSnapshot['sails']['nextCutover']>,
  twa: number,
  tws: number,
): number | null {
  if (cutover.kind === 'tws') {
    const trend = snapshot.wind.twsTrendKnPerHour;
    const toward = cutover.value > tws ? 1 : cutover.value < tws ? -1 : 0;
    if (trend == null || toward === 0 || Math.sign(trend) !== toward) return null;
    return shown(trend);
  }
  const slope = snapshot.wind.twa.slopePerMin;
  const toward = cutover.value > twa ? 1 : cutover.value < twa ? -1 : 0;
  if (slope == null || toward === 0 || Math.sign(slope) !== toward) return null;
  return shown(slope * 60);
}

function nextHigherTwsCut(plan: SailPlan | null, tws: number | null, snapshot: CoachSnapshot): number | null {
  if (tws == null) return null;
  if (plan) {
    const higher = plan.twsCuts.filter(cut => cut > tws).sort((a, b) => a - b);
    if (higher.length) return higher[0];
  }
  const cutover = snapshot.sails.nextCutover;
  if (cutover?.kind === 'tws' && cutover.value > tws) return cutover.value;
  return null;
}

function nextPrimary(
  plan: SailPlan | null,
  twa: number,
  tws: number,
  cutover: NonNullable<CoachSnapshot['sails']['nextCutover']>,
): string | null {
  if (!plan) return null;
  if (plan.heavyWeather.enabled && tws >= plan.heavyWeather.twsFrom && cutover.kind === 'twa') {
    const bands = bandsFromCuts(plan.heavyWeather.twaCuts);
    const idx = findBandIndex(bands, twa);
    const next = cutover.value > twa ? idx + 1 : idx - 1;
    return primaryOf(plan.heavyWeather.cells[next]);
  }
  const twaBands = bandsFromCuts(plan.twaCuts);
  const twsBands = bandsFromCuts(plan.twsCuts);
  let row = findBandIndex(twaBands, twa);
  let col = findBandIndex(twsBands, tws);
  if (cutover.kind === 'tws') col += cutover.value > tws ? 1 : -1;
  else row += cutover.value > twa ? 1 : -1;
  return primaryOf(plan.cells[row]?.[col]);
}

function primaryOf(cell: { primary?: string } | undefined): string | null {
  const primary = cell?.primary?.trim() ?? '';
  return primary || null;
}

function avoidSentence(avoid: string | undefined): string {
  const trimmed = avoid?.trim() ?? '';
  if (!trimmed) return '';
  if (/^avoid\b/i.test(trimmed)) return trimmed;
  return `Avoid: ${trimmed}`;
}

function minutesUp(snapshot: CoachSnapshot): number | null {
  const changed = snapshot.sails.upChangedAt;
  if (changed == null) return null;
  const minutes = Math.round((snapshot.builtAt - changed) / 60_000);
  return minutes >= 0 ? minutes : null;
}

function ready(snapshot: CoachSnapshot, ids: string[]): boolean {
  return ids.every(id => snapshot.dataHealth.some(row => row.input === id && row.status === 'ok'));
}

function labelFor(input: string): string {
  if (input in COACH_INPUT_LABELS) return COACH_INPUT_LABELS[input as CoachInputId];
  return input;
}

function signed180(deg: number): number {
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function shown(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function evidenceOf(values: Record<string, number | string | boolean>): Record<string, number | string | boolean> {
  return values;
}

function finding(body: CoachFinding): CoachFinding {
  const evidence = { ...body.evidence };
  const values = new Set(Object.values(evidence).filter((item): item is number => typeof item === 'number'));
  let extra = 0;
  for (const raw of body.text.match(/-?\d+(?:\.\d+)?/g) ?? []) {
    const value = Number(raw);
    if (values.has(value)) continue;
    evidence[`n${extra}`] = value;
    values.add(value);
    extra += 1;
  }
  return { ...body, evidence };
}

function compareFindings(a: CoachFinding, b: CoachFinding): number {
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    || CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence]
    || SECTION_RANK[a.section] - SECTION_RANK[b.section]
    || a.id.localeCompare(b.id);
}
