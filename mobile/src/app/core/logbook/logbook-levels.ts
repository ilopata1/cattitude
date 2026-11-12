import { BatteryLog, LogEntry, TankLog } from '../models/logbook.model';

export interface LogLevelColumn {
  key: string;
  label: string;
}

const HOUSE_IDS = new Set(['0', 'house']);

/**
 * Columns for the fresh-water tanks, fuel tanks, and house battery on these
 * entries. Black water and other holding tanks are left out. The house
 * battery is Signal K battery 0, or an instance named `house`.
 */
export function logLevelColumns(entries: LogEntry[]): LogLevelColumn[] {
  const water = new Set<string>();
  const fuel = new Set<string>();
  for (const entry of entries) {
    for (const tank of tanksOf(entry)) {
      const kind = tankKind(tank.type);
      if (kind === 'water') water.add(tank.id);
      else if (kind === 'fuel') fuel.add(tank.id);
    }
  }
  const columns: LogLevelColumn[] = [];
  pushTanks(columns, 'water', 'Water', [...water]);
  pushTanks(columns, 'fuel', 'Fuel', [...fuel]);
  columns.push({ key: 'house', label: 'House' });
  return columns;
}

/** One line for a card, or empty when the entry recorded none of these readings. */
export function logLevelsSummary(entry: LogEntry): string {
  const tanks = logLevelColumns([entry]).filter(column => column.key !== 'house');
  const house = houseBattery(entry);
  if (!tanks.length && !house) return '';
  const parts = tanks.map(column => `${column.label} ${formatLevelPercent(levelRatio(entry, column.key))}`);
  parts.push(`House ${formatLevelPercent(house?.soc ?? null)}`);
  return parts.join(' · ');
}

/** Ratio 0–1 for a level column, or null when that reading was not stored. */
export function levelRatio(entry: LogEntry, key: string): number | null {
  if (key === 'house') return houseBattery(entry)?.soc ?? null;
  const split = key.indexOf(':');
  if (split < 0) return null;
  const kind = key.slice(0, split);
  const id = key.slice(split + 1);
  const tank = tanksOf(entry).find(item => tankKind(item.type) === kind && item.id === id);
  return tank?.level ?? null;
}

/** Whole percent when the value lands on an integer, otherwise one decimal. */
export function formatLevelNumber(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  const percent = Math.round(ratio * 1000) / 10;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

export function formatLevelPercent(ratio: number | null): string {
  const number = formatLevelNumber(ratio);
  return number === '—' ? '—' : `${number}%`;
}

/** Blank for CSV when the reading is missing. */
export function levelPercentCsv(ratio: number | null): string {
  const number = formatLevelNumber(ratio);
  return number === '—' ? '' : number;
}

function pushTanks(columns: LogLevelColumn[], kind: string, label: string, ids: string[]): void {
  const ordered = ids.sort(compareInstance);
  for (const id of ordered) {
    columns.push({
      key: `${kind}:${id}`,
      label: ordered.length === 1 && /^\d+$/.test(id) ? label : `${label} ${id}`,
    });
  }
}

function tanksOf(entry: LogEntry): TankLog[] {
  return entry.ship?.tanks ?? [];
}

function houseBattery(entry: LogEntry): BatteryLog | null {
  const batteries = entry.ship?.batteries ?? [];
  return batteries.find(battery => battery.id === '0')
    ?? batteries.find(battery => HOUSE_IDS.has(battery.id.trim().toLowerCase()))
    ?? null;
}

function tankKind(type: string): 'fuel' | 'water' | null {
  const key = type.trim().toLowerCase().replace(/[_-]/g, '');
  if (key === 'fuel') return 'fuel';
  if (key === 'freshwater' || key === 'water') return 'water';
  return null;
}

function compareInstance(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  return a.localeCompare(b);
}
