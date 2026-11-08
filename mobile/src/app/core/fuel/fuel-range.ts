/**
 * Remaining fuel, in time and distance, at the current RPM.
 *
 * The curve is the propeller law. Burn rises with RPM, and the exponent is
 * fitted so the curve passes through the two engine-chart points:
 *
 *   Exponent = ln(max fuel / fuel at 2,000 rpm) / ln(max RPM / 2,000)
 *   Litres/hour per engine = max fuel × (RPM / max RPM) ^ exponent
 *
 * Chart figures are for one engine. Each engine contributes its own RPM.
 * When the stream publishes a single RPM, that RPM is used for every engine.
 * Idle, when set below the 2,000 rpm figure, is a floor for a running engine
 * and is not part of the exponent.
 */

export const CRUISE_RPM = 2000;
/** Below this the engine counts as stopped, matching the logbook. */
export const RUNNING_RPM = 300;
export const FUEL_RANGE_WIDGET_ID = 'widget:fuel-range';

export interface FuelCurveSettings {
  maxRpm: number | null;
  /** Litres per hour at max RPM, for one engine. */
  maxFuelLph: number | null;
  /** Litres per hour at 2,000 RPM, for one engine. */
  cruiseFuelLph: number | null;
  engineCount: number | null;
  /** Optional litres per hour at idle, for one engine. */
  idleFuelLph: number | null;
}

export interface FuelCurveFields {
  maxRpm: string;
  maxFuelLph: string;
  cruiseFuelLph: string;
  engineCount: string;
  idleFuelLph: string;
}

export interface FuelEngine {
  id: string;
  rpm: number | null;
}

export interface FuelTankSlice {
  kind: string;
  level: number | null;
  capacityM3: number | null;
}

export type FuelRangeStatus = 'ready' | 'needs-settings' | 'needs-fuel' | 'needs-rpm' | 'stopped';

export interface FuelRangeView {
  status: FuelRangeStatus;
  hours: string;
  distance: string;
  burn: string;
  remaining: string;
  rpm: string;
  speed: string;
  note: string;
}

export function emptyFuelCurve(): FuelCurveSettings {
  return {
    maxRpm: null,
    maxFuelLph: null,
    cruiseFuelLph: null,
    engineCount: null,
    idleFuelLph: null,
  };
}

/** Used until this device saves its own chart. */
export function defaultFuelCurve(): FuelCurveSettings {
  return {
    maxRpm: 2700,
    maxFuelLph: 13.3,
    cruiseFuelLph: 4.451,
    engineCount: 2,
    idleFuelLph: null,
  };
}

export function normalizeFuelCurve(value: unknown): FuelCurveSettings {
  const body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    maxRpm: wholeNumber(body['maxRpm'], 20000),
    maxFuelLph: positiveNumber(body['maxFuelLph'], 1000),
    cruiseFuelLph: positiveNumber(body['cruiseFuelLph'], 1000),
    engineCount: engineCount(body['engineCount']),
    idleFuelLph: positiveNumber(body['idleFuelLph'], 1000),
  };
}

export function fuelCurveFromText(fields: FuelCurveFields): FuelCurveSettings {
  return normalizeFuelCurve({
    maxRpm: numberOrNull(fields.maxRpm),
    maxFuelLph: numberOrNull(fields.maxFuelLph),
    cruiseFuelLph: numberOrNull(fields.cruiseFuelLph),
    engineCount: numberOrNull(fields.engineCount),
    idleFuelLph: numberOrNull(fields.idleFuelLph),
  });
}

/** Null when the two chart points cannot define a rising curve. */
export function fuelExponent(curve: FuelCurveSettings): number | null {
  if (curve.maxRpm == null || curve.maxRpm <= CRUISE_RPM) return null;
  if (curve.maxFuelLph == null || curve.maxFuelLph <= 0) return null;
  if (curve.cruiseFuelLph == null || curve.cruiseFuelLph <= 0) return null;
  if (curve.cruiseFuelLph > curve.maxFuelLph) return null;
  const exponent = Math.log(curve.maxFuelLph / curve.cruiseFuelLph) / Math.log(curve.maxRpm / CRUISE_RPM);
  if (!Number.isFinite(exponent) || exponent < 0) return null;
  return exponent;
}

export function fuelCurveReady(curve: FuelCurveSettings): boolean {
  return fuelExponent(curve) != null && curve.engineCount != null && curve.engineCount >= 1;
}

/**
 * Litres per hour for one engine. Null RPM is unknown. An engine under
 * {@link RUNNING_RPM} is stopped and burns nothing.
 */
export function engineFuelLph(rpm: number | null, curve: FuelCurveSettings, exponent: number): number | null {
  if (rpm == null) return null;
  if (rpm < RUNNING_RPM) return 0;
  if (curve.maxRpm == null || curve.maxFuelLph == null || curve.maxRpm <= 0) return null;
  const curveBurn = curve.maxFuelLph * (rpm / curve.maxRpm) ** exponent;
  if (!Number.isFinite(curveBurn)) return null;
  const idle = curve.idleFuelLph;
  const cruise = curve.cruiseFuelLph;
  if (idle != null && cruise != null && idle < cruise && curveBurn < idle) return idle;
  return curveBurn;
}

/**
 * Total litres per hour. Null when RPM has not arrived.
 * A single published RPM is applied to every configured engine.
 */
export function totalFuelLph(engines: FuelEngine[], curve: FuelCurveSettings): number | null {
  const exponent = fuelExponent(curve);
  if (exponent == null || curve.engineCount == null) return null;
  if (engines.length === 0) return null;
  if (engines.length === 1 && curve.engineCount > 1) {
    const one = engineFuelLph(engines[0].rpm, curve, exponent);
    return one == null ? null : one * curve.engineCount;
  }
  let known = 0;
  let total = 0;
  for (const engine of engines) {
    const burn = engineFuelLph(engine.rpm, curve, exponent);
    if (burn == null) continue;
    known += 1;
    total += burn;
  }
  return known === 0 ? null : total;
}

export function remainingFuelLitres(tanks: FuelTankSlice[]): number | null {
  let total = 0;
  let any = false;
  for (const tank of tanks) {
    if (tank.kind !== 'fuel' || tank.level == null || tank.capacityM3 == null) continue;
    total += tank.level * tank.capacityM3 * 1000;
    any = true;
  }
  return any ? total : null;
}

export function fuelRangeView(input: {
  curve: FuelCurveSettings;
  engines: FuelEngine[];
  sogKn: number | null;
  tanks: FuelTankSlice[];
}): FuelRangeView {
  const remaining = remainingFuelLitres(input.tanks);
  const ready = fuelCurveReady(input.curve);
  const burn = ready ? totalFuelLph(input.engines, input.curve) : null;
  const view: FuelRangeView = {
    status: 'needs-settings',
    hours: '—',
    distance: '—',
    burn: '—',
    remaining: remaining == null ? '—' : formatLitres(remaining),
    rpm: formatRpm(input.engines, input.curve.engineCount),
    speed: input.sogKn == null ? '—' : `${input.sogKn.toFixed(1)} kn`,
    note: 'Set the fuel curve in Settings.',
  };
  if (!ready) return view;
  if (burn != null) view.burn = formatRate(burn);
  if (remaining == null) {
    return { ...view, status: 'needs-fuel', note: 'Waiting for a fuel level and tank size.' };
  }
  if (burn == null) {
    return { ...view, status: 'needs-rpm', note: 'Waiting for engine RPM.' };
  }
  if (burn <= 0) {
    if (input.engines.some((engine) => engine.rpm == null)) {
      return { ...view, status: 'needs-rpm', burn: '—', note: 'Waiting for engine RPM.' };
    }
    return { ...view, status: 'stopped', note: 'Engines are not turning.' };
  }
  const hours = remaining / burn;
  view.status = 'ready';
  view.hours = formatDuration(hours);
  view.note = '';
  if (input.sogKn == null) {
    view.note = 'Waiting for speed over ground.';
  } else if (input.sogKn < 0.2) {
    view.note = 'Not moving.';
  } else {
    view.distance = formatNm(hours * input.sogKn);
  }
  return view;
}

export function fuelCurveSummary(curve: FuelCurveSettings): string {
  const exponent = fuelExponent(curve);
  if (exponent == null || curve.maxRpm == null) return '';
  const sampleRpm = curve.maxRpm > 2500 ? 2500 : Math.round((CRUISE_RPM + curve.maxRpm) / 2);
  const burn = engineFuelLph(sampleRpm, curve, exponent);
  if (burn == null || burn <= 0) return '';
  const expText = (Math.round(exponent * 100) / 100).toFixed(2);
  return `Exponent ${expText}. At ${sampleRpm} rpm each engine burns ${formatRate(burn)}.`;
}

export function fuelCurveError(fields: FuelCurveFields): string {
  const curve = fuelCurveFromText(fields);
  if (fields.maxRpm.trim() && curve.maxRpm == null) return 'Enter a max RPM.';
  if (curve.maxRpm != null && curve.maxRpm <= CRUISE_RPM) return 'Max RPM needs to be above 2,000.';
  if (fields.maxFuelLph.trim() && curve.maxFuelLph == null) return 'Enter the fuel use at max RPM in litres per hour.';
  if (fields.cruiseFuelLph.trim() && curve.cruiseFuelLph == null) return 'Enter the fuel use at 2,000 RPM in litres per hour.';
  if (
    curve.maxFuelLph != null
    && curve.cruiseFuelLph != null
    && curve.cruiseFuelLph > curve.maxFuelLph
  ) {
    return 'Fuel at max RPM needs to be at least the fuel at 2,000 RPM.';
  }
  if (fields.engineCount.trim() && curve.engineCount == null) return 'Number of engines needs to be from 1 to 8.';
  if (fields.idleFuelLph.trim() && curve.idleFuelLph == null) {
    return 'Enter idle fuel in litres per hour, or leave it blank.';
  }
  return '';
}

export function fuelCurveIdleNote(curve: FuelCurveSettings): string {
  if (curve.idleFuelLph == null || curve.cruiseFuelLph == null) return '';
  if (curve.idleFuelLph < curve.cruiseFuelLph) return '';
  return 'Idle fuel is left unused unless it is below the 2,000 RPM figure.';
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} min`;
  }
  if (hours < 10) return `${trimTenths(hours)} h`;
  return `${Math.round(hours)} h`;
}

function formatNm(nm: number): string {
  if (nm < 10) return `${trimTenths(nm)} nm`;
  return `${Math.round(nm)} nm`;
}

function formatRate(lph: number): string {
  return `${trimTenths(lph)} L/h`;
}

function formatLitres(litres: number): string {
  if (litres < 10) return `${trimTenths(litres)} L`;
  return `${Math.round(litres)} L`;
}

function formatRpm(engines: FuelEngine[], engineCount: number | null): string {
  const known = engines.filter((engine): engine is FuelEngine & { rpm: number } => engine.rpm != null);
  if (!known.length) return '—';
  if (engines.length === 1 && engineCount != null && engineCount > 1) {
    return `${Math.round(known[0].rpm)} rpm × ${engineCount}`;
  }
  if (known.every((engine) => engine.rpm === known[0].rpm)) {
    return `${Math.round(known[0].rpm)} rpm`;
  }
  return known
    .map((engine) => `${engineLabel(engine.id)} ${Math.round(engine.rpm)}`)
    .join(' · ');
}

function engineLabel(id: string): string {
  return /^\d+$/.test(id) ? `Engine ${id}` : id;
}

function trimTenths(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function numberOrNull(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function wholeNumber(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) return null;
  return Math.round(value);
}

function positiveNumber(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) return null;
  return Math.round(value * 1000) / 1000;
}

function engineCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 8) return null;
  return value;
}
