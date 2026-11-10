/**
 * The Levels tab calls battery 0 the house battery unless Signal K names it.
 * Charge on the stream is a ratio. The setting is a percentage.
 */

import { batteryTitle, LevelsState } from './levels';

export const DEFAULT_HOUSE_BATTERY_PERCENT = 30;

export interface HouseBatteryNotice {
  title: string;
  body: string;
}

export interface HouseBatteryPercentInput {
  percent: number;
  error: string;
}

/** Blank text keeps the default. Anything outside 0–100 is refused. */
export function houseBatteryPercentFromText(value: string): HouseBatteryPercentInput {
  const trimmed = value.trim();
  if (!trimmed) {
    return { percent: DEFAULT_HOUSE_BATTERY_PERCENT, error: '' };
  }
  const percent = Number(trimmed);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { percent: DEFAULT_HOUSE_BATTERY_PERCENT, error: 'Enter a percentage from 0 to 100.' };
  }
  return { percent, error: '' };
}

export function formatHousePercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Charge shown on Levels, in percent. Null when battery 0 has no state of charge.
 */
export function houseChargePercent(state: LevelsState): number | null {
  const house = state.batteries.find((battery) => battery.id === '0');
  if (!house || house.stateOfCharge == null) return null;
  return Math.round(house.stateOfCharge * 1000) / 10;
}

/** Null when the charge is missing, or it is not under the setting. */
export function houseBatteryNotice(state: LevelsState, thresholdPercent: number): HouseBatteryNotice | null {
  const charge = houseChargePercent(state);
  if (charge == null || !Number.isFinite(thresholdPercent)) return null;
  const limit = Math.round(thresholdPercent * 10) / 10;
  if (charge >= limit) return null;
  const house = state.batteries.find((battery) => battery.id === '0');
  const title = house ? batteryTitle(house) : 'House battery';
  return {
    title,
    body: `${title} is at ${formatHousePercent(charge)}%. The alert is set for ${formatHousePercent(limit)}%.`,
  };
}
