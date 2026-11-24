/** Alarms the boat raises full time, as Signal K notifications the app already shows. */

const DEFAULT_HOUSE_BATTERY_PERCENT = 30;
const HOUSE_BATTERY_PATH = 'notifications.cattitude.houseBattery';

function normalizeAlerts(raw) {
  const percent = Number(raw?.houseBatteryPercent);
  return {
    houseBatteryPercent: Number.isFinite(percent) && percent >= 0 && percent <= 100
      ? percent
      : DEFAULT_HOUSE_BATTERY_PERCENT,
  };
}

function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Battery 0 is the house battery, as on the Levels tab. Returns the notification
 * state to publish, or null when there is no charge reading to judge.
 */
function houseBatteryAlarm(reading, alerts) {
  const house = (reading.batteries || []).find((battery) => battery.id === '0');
  if (!house || house.soc == null) return null;
  const charge = Math.round(house.soc * 1000) / 10;
  const limit = Math.round(normalizeAlerts(alerts).houseBatteryPercent * 10) / 10;
  if (charge >= limit) {
    return { state: 'normal', method: [], message: `House battery is at ${formatPercent(charge)}%.` };
  }
  return {
    state: 'alarm',
    method: ['visual', 'sound'],
    message: `House battery is at ${formatPercent(charge)}%. The alert is set for ${formatPercent(limit)}%.`,
  };
}

module.exports = { DEFAULT_HOUSE_BATTERY_PERCENT, HOUSE_BATTERY_PATH, houseBatteryAlarm, normalizeAlerts };
