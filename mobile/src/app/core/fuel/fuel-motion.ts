/**
 * Engine RPM and speed over ground taken from the Signal K stream.
 * Revolutions arrive in hertz. Speed over ground arrives in metres per second.
 */

import { knotsFromMps, rpmFromRevolutions } from '../logbook/logbook-math';
import { FuelEngine } from './fuel-range';

export interface FuelMotionState {
  engines: FuelEngine[];
  sogKn: number | null;
}

export function emptyFuelMotion(): FuelMotionState {
  return { engines: [], sogKn: null };
}

/** Fold one Signal K value into the live RPM and speed. Returns true when the snapshot changed. */
export function ingestFuelMotion(state: FuelMotionState, path: string, value: unknown): boolean {
  const key = path.replace(/^self\./, '').replace(/^vessels\.[^.]+\./, '');
  if (key === 'navigation.speedOverGround') return setSog(state, value);

  const engine = key.match(/^propulsion\.([^.]+)$/);
  if (engine) {
    if (!isMainEngine(engine[1]) || value == null || typeof value !== 'object') return false;
    const body = value as { revolutions?: unknown };
    if (!('revolutions' in body)) return false;
    return setRpm(state, engine[1], body.revolutions);
  }

  const revolutions = key.match(/^propulsion\.([^.]+)\.revolutions$/);
  if (!revolutions || !isMainEngine(revolutions[1])) return false;
  return setRpm(state, revolutions[1], value);
}

export function enginesInOrder(engines: FuelEngine[]): FuelEngine[] {
  return [...engines].sort((a, b) => compareInstance(a.id, b.id));
}

function setSog(state: FuelMotionState, value: unknown): boolean {
  if (value == null) return assignSog(state, null);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  return assignSog(state, knotsFromMps(value));
}

function setRpm(state: FuelMotionState, id: string, value: unknown): boolean {
  if (value == null) return assignRpm(state, id, null);
  if (typeof value !== 'number') return false;
  const rpm = rpmFromRevolutions(value);
  if (rpm == null) return false;
  return assignRpm(state, id, rpm);
}

function assignSog(state: FuelMotionState, sogKn: number | null): boolean {
  if (state.sogKn === sogKn) return false;
  state.sogKn = sogKn;
  return true;
}

function assignRpm(state: FuelMotionState, id: string, rpm: number | null): boolean {
  const existing = state.engines.find((engine) => engine.id === id);
  if (!existing) {
    if (rpm == null) return false;
    state.engines.push({ id, rpm });
    return true;
  }
  if (existing.rpm === rpm) return false;
  existing.rpm = rpm;
  return true;
}

/** Thrusters and generators publish propulsion paths, and they do not burn on this curve. */
function isMainEngine(id: string): boolean {
  return !/thruster|generator|genset/i.test(id);
}

function compareInstance(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  return a.localeCompare(b);
}
