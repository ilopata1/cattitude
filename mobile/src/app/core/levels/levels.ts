/**
 * Tank and battery readings taken from the Signal K stream.
 * Level and state of charge are ratios, capacity is cubic metres, and
 * temperature is kelvin. Display converts those units. Capacities are never
 * stored in the app.
 */

import { ratioOrPercent, temperatureC } from '../logbook/logbook-math';

export type TankKind = 'fuel' | 'freshWater' | 'blackWater';
export type LevelKind = TankKind | 'battery';

export interface TankLevel {
  id: string;
  kind: TankKind;
  name: string | null;
  /** Remaining fraction, 0–1. */
  level: number | null;
  /** Cubic metres, as sent. */
  capacityM3: number | null;
}

export interface BatteryLevel {
  id: string;
  name: string | null;
  voltage: number | null;
  current: number | null;
  temperatureC: number | null;
  /** Remaining fraction, 0–1. */
  stateOfCharge: number | null;
}

export interface LevelsState {
  tanks: TankLevel[];
  batteries: BatteryLevel[];
}

export interface TankView {
  key: string;
  kind: TankKind;
  title: string;
  face: string;
  /** 0–100 when a level has arrived. Null leaves the bar empty. */
  fill: number | null;
}

export interface BatteryView {
  key: string;
  title: string;
  charge: string;
  chargeFill: number | null;
  voltage: string;
  current: string;
  temperature: string;
}

export interface LevelGroupView {
  id: TankKind | 'batteries';
  label: string;
  tanks: TankView[];
  batteries: BatteryView[];
}

const TANK_KINDS: TankKind[] = ['fuel', 'freshWater', 'blackWater'];

export function emptyLevels(): LevelsState {
  return { tanks: [], batteries: [] };
}

/**
 * Fold one Signal K value into the live levels. Paths may be relative or
 * prefixed with `self.` / `vessels.<id>.`. Returns true when the snapshot changed.
 */
export function ingestLevel(state: LevelsState, path: string, value: unknown): boolean {
  const key = stripVessel(path);
  const tank = key.match(/^tanks\.(fuel|freshWater|blackWater)\.([^.]+)(?:\.(currentLevel|capacity|name))?$/);
  if (tank) {
    return ingestTank(state, tank[1] as TankKind, tank[2], tank[3] as TankField | undefined, value);
  }
  const charge = key.match(/^electrical\.batteries\.([^.]+)\.capacity\.stateOfCharge$/);
  if (charge) {
    return setCharge(state, charge[1], value);
  }
  const battery = key.match(/^electrical\.batteries\.([^.]+)(?:\.(voltage|current|temperature|name|capacity))?$/);
  if (battery) {
    return ingestBattery(state, battery[1], battery[2] as BatteryField | undefined, value);
  }
  return false;
}

/** Use a Signal K display name until the path's own `name` value arrives. */
export function ingestLevelMeta(state: LevelsState, path: string, value: unknown): boolean {
  const name = metaName(value);
  if (!name) return false;
  const key = stripVessel(path);
  const tank = key.match(/^tanks\.(fuel|freshWater|blackWater)\.([^.]+)/);
  if (tank) {
    return setTankName(state, tank[1] as TankKind, tank[2], name, true);
  }
  const battery = key.match(/^electrical\.batteries\.([^.]+)/);
  if (battery) {
    return setBatteryName(state, battery[1], name, true);
  }
  return false;
}

export function levelGroups(state: LevelsState): LevelGroupView[] {
  const groups: LevelGroupView[] = [];
  for (const kind of TANK_KINDS) {
    const tanks = tanksInKind(state, kind).map(tankView);
    if (tanks.length) {
      groups.push({ id: kind, label: tankKindLabel(kind), tanks, batteries: [] });
    }
  }
  const batteries = batteriesInOrder(state).map(batteryView);
  if (batteries.length) {
    groups.push({ id: 'batteries', label: 'Batteries', tanks: [], batteries });
  }
  return groups;
}

export function tanksInOrder(state: LevelsState): TankLevel[] {
  return TANK_KINDS.flatMap((kind) => tanksInKind(state, kind));
}

export function batteriesInOrder(state: LevelsState): BatteryLevel[] {
  return [...state.batteries].sort((a, b) => compareInstance(a.id, b.id));
}

export function tankKindLabel(kind: TankKind): string {
  switch (kind) {
    case 'fuel':
      return 'Fuel';
    case 'freshWater':
      return 'Drinking water';
    case 'blackWater':
      return 'Sewage holding tank';
  }
}

export function tankTitle(tank: TankLevel): string {
  return tank.name ?? `${tankKindTitle(tank.kind)} ${tank.id}`;
}

export function batteryTitle(battery: BatteryLevel): string {
  return battery.name ?? (battery.id === '0' ? 'House battery' : `Battery ${battery.id}`);
}

export function levelWidgetId(kind: LevelKind, id: string): string {
  return `widget:level:${kind}:${id}`;
}

/** Home tile text. Tank tiles show the percent. Battery tiles show voltage. */
export function levelWidgetValue(state: LevelsState, widgetId: string): string | null {
  const ref = parseLevelWidgetId(widgetId);
  if (!ref) return null;
  if (ref.kind === 'battery') {
    const battery = state.batteries.find((item) => item.id === ref.id);
    return battery?.voltage == null ? '—' : formatVolts(battery.voltage);
  }
  const tank = state.tanks.find((item) => item.kind === ref.kind && item.id === ref.id);
  return tank?.level == null ? '—' : percentText(tank.level);
}

export function parseLevelWidgetId(widgetId: string): { kind: LevelKind; id: string } | null {
  const match = widgetId.match(/^widget:level:(fuel|freshWater|blackWater|battery):([\s\S]+)$/);
  if (!match) return null;
  return { kind: match[1] as LevelKind, id: match[2] };
}

function tankView(tank: TankLevel): TankView {
  const percent = tank.level == null ? null : percentText(tank.level);
  const litres = tank.capacityM3 == null ? null : litresText(tank.capacityM3);
  let face = '—';
  if (percent && litres) face = `${percent} of ${litres}`;
  else if (percent) face = percent;
  else if (litres) face = `— of ${litres}`;
  return {
    key: `${tank.kind}:${tank.id}`,
    kind: tank.kind,
    title: tankTitle(tank),
    face,
    fill: fillPercent(tank.level),
  };
}

function batteryView(battery: BatteryLevel): BatteryView {
  return {
    key: battery.id,
    title: batteryTitle(battery),
    charge: battery.stateOfCharge == null ? '—' : percentText(battery.stateOfCharge),
    chargeFill: fillPercent(battery.stateOfCharge),
    voltage: battery.voltage == null ? '—' : formatVolts(battery.voltage),
    current: battery.current == null ? '—' : formatAmps(battery.current),
    temperature: battery.temperatureC == null ? '—' : formatCelsius(battery.temperatureC),
  };
}

function percentText(ratio: number): string {
  const pct = Math.round(ratio * 1000) / 10;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${text}%`;
}

function litresText(m3: number): string {
  const litres = m3 * 1000;
  if (litres < 10) {
    const rounded = Math.round(litres * 10) / 10;
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${text} L`;
  }
  return `${Math.round(litres)} L`;
}

function fillPercent(ratio: number | null): number | null {
  if (ratio == null) return null;
  return Math.min(100, Math.max(0, ratio * 100));
}

function formatVolts(voltage: number): string {
  return `${voltage.toFixed(1)} V`;
}

function formatAmps(current: number): string {
  const magnitude = Math.abs(current).toFixed(1);
  return `${current < 0 ? '\u2212' : ''}${magnitude} A`;
}

function formatCelsius(celsius: number): string {
  const rounded = Math.round(celsius * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} °C`;
}

type TankField = 'currentLevel' | 'capacity' | 'name';
type BatteryField = 'voltage' | 'current' | 'temperature' | 'name' | 'capacity';

function ingestTank(
  state: LevelsState,
  kind: TankKind,
  id: string,
  field: TankField | undefined,
  value: unknown,
): boolean {
  if (!field) {
    if (value == null) return clearTank(state, kind, id);
    if (typeof value !== 'object') return false;
    const body = value as { currentLevel?: unknown; capacity?: unknown; name?: unknown };
    let changed = false;
    if ('currentLevel' in body) changed = setLevel(state, kind, id, body.currentLevel) || changed;
    if ('capacity' in body) changed = setCapacity(state, kind, id, body.capacity) || changed;
    if ('name' in body) changed = setTankName(state, kind, id, body.name, false) || changed;
    return changed;
  }
  if (field === 'currentLevel') return setLevel(state, kind, id, value);
  if (field === 'capacity') return setCapacity(state, kind, id, value);
  return setTankName(state, kind, id, value, false);
}

function ingestBattery(
  state: LevelsState,
  id: string,
  field: BatteryField | undefined,
  value: unknown,
): boolean {
  if (!field) {
    if (value == null) return clearBattery(state, id);
    if (typeof value !== 'object') return false;
    const body = value as {
      voltage?: unknown;
      current?: unknown;
      temperature?: unknown;
      name?: unknown;
      capacity?: unknown;
    };
    let changed = false;
    if ('voltage' in body) changed = setVoltage(state, id, body.voltage) || changed;
    if ('current' in body) changed = setCurrent(state, id, body.current) || changed;
    if ('temperature' in body) changed = setTemperature(state, id, body.temperature) || changed;
    if ('name' in body) changed = setBatteryName(state, id, body.name, false) || changed;
    if ('capacity' in body) changed = setChargeFromCapacity(state, id, body.capacity) || changed;
    return changed;
  }
  if (field === 'voltage') return setVoltage(state, id, value);
  if (field === 'current') return setCurrent(state, id, value);
  if (field === 'temperature') return setTemperature(state, id, value);
  if (field === 'name') return setBatteryName(state, id, value, false);
  return setChargeFromCapacity(state, id, value);
}

function setLevel(state: LevelsState, kind: TankKind, id: string, value: unknown): boolean {
  if (value == null) return updateTank(state, kind, id, (tank) => assign(tank, 'level', null));
  if (typeof value !== 'number') return false;
  const ratio = ratioOrPercent(value);
  if (ratio == null) return false;
  return updateTank(state, kind, id, (tank) => assign(tank, 'level', ratio), true);
}

function setCapacity(state: LevelsState, kind: TankKind, id: string, value: unknown): boolean {
  if (value == null) return updateTank(state, kind, id, (tank) => assign(tank, 'capacityM3', null));
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  return updateTank(state, kind, id, (tank) => assign(tank, 'capacityM3', value), true);
}

function setTankName(
  state: LevelsState,
  kind: TankKind,
  id: string,
  value: unknown,
  keepExisting: boolean,
): boolean {
  const name = readName(value);
  if (name === undefined) return false;
  if (keepExisting && !name) return false;
  return updateTank(state, kind, id, (tank) => {
    if (keepExisting && tank.name) return false;
    return assign(tank, 'name', name);
  }, name != null);
}

function setVoltage(state: LevelsState, id: string, value: unknown): boolean {
  return setBatteryNumber(state, id, 'voltage', value, finiteOrNull);
}

function setCurrent(state: LevelsState, id: string, value: unknown): boolean {
  return setBatteryNumber(state, id, 'current', value, finiteOrNull);
}

function setTemperature(state: LevelsState, id: string, value: unknown): boolean {
  return setBatteryNumber(state, id, 'temperatureC', value, (raw) => {
    if (raw == null) return null;
    if (typeof raw !== 'number') return undefined;
    const celsius = temperatureC(raw);
    return celsius == null ? undefined : celsius;
  });
}

function setCharge(state: LevelsState, id: string, value: unknown): boolean {
  return setBatteryNumber(state, id, 'stateOfCharge', value, (raw) => {
    if (raw == null) return null;
    if (typeof raw !== 'number') return undefined;
    const ratio = ratioOrPercent(raw);
    return ratio == null ? undefined : ratio;
  });
}

function setChargeFromCapacity(state: LevelsState, id: string, value: unknown): boolean {
  if (value == null) return setCharge(state, id, null);
  if (typeof value !== 'object') return false;
  const body = value as { stateOfCharge?: unknown };
  if (!('stateOfCharge' in body)) return false;
  return setCharge(state, id, body.stateOfCharge);
}

function setBatteryName(state: LevelsState, id: string, value: unknown, keepExisting: boolean): boolean {
  const name = readName(value);
  if (name === undefined) return false;
  if (keepExisting && !name) return false;
  return updateBattery(state, id, (battery) => {
    if (keepExisting && battery.name) return false;
    return assign(battery, 'name', name);
  }, name != null);
}

function setBatteryNumber<K extends 'voltage' | 'current' | 'temperatureC' | 'stateOfCharge'>(
  state: LevelsState,
  id: string,
  field: K,
  value: unknown,
  convert: (raw: unknown) => number | null | undefined,
): boolean {
  const next = convert(value);
  if (next === undefined) return false;
  return updateBattery(state, id, (battery) => assign(battery, field, next), next != null);
}

function finiteOrNull(value: unknown): number | null | undefined {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

/** Null clears. A string is trimmed. Anything else is ignored. */
function readName(value: unknown): string | null | undefined {
  if (value == null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function metaName(value: unknown): string | null {
  if (typeof value === 'string') return readName(value) ?? null;
  if (!value || typeof value !== 'object') return null;
  const meta = value as { displayName?: unknown; name?: unknown };
  if (typeof meta.displayName === 'string') return readName(meta.displayName) ?? null;
  if (typeof meta.name === 'string') return readName(meta.name) ?? null;
  return null;
}

function clearTank(state: LevelsState, kind: TankKind, id: string): boolean {
  return updateTank(state, kind, id, (tank) => {
    let changed = false;
    changed = assign(tank, 'level', null) || changed;
    changed = assign(tank, 'capacityM3', null) || changed;
    changed = assign(tank, 'name', null) || changed;
    return changed;
  });
}

function clearBattery(state: LevelsState, id: string): boolean {
  return updateBattery(state, id, (battery) => {
    let changed = false;
    changed = assign(battery, 'voltage', null) || changed;
    changed = assign(battery, 'current', null) || changed;
    changed = assign(battery, 'temperatureC', null) || changed;
    changed = assign(battery, 'stateOfCharge', null) || changed;
    changed = assign(battery, 'name', null) || changed;
    return changed;
  });
}

function updateTank(
  state: LevelsState,
  kind: TankKind,
  id: string,
  apply: (tank: TankLevel) => boolean,
  create = false,
): boolean {
  const existing = state.tanks.find((tank) => tank.kind === kind && tank.id === id);
  if (!existing && !create) return false;
  const tank = existing ?? { id, kind, name: null, level: null, capacityM3: null };
  const changed = apply(tank);
  if (!existing && changed) state.tanks.push(tank);
  return changed;
}

function updateBattery(
  state: LevelsState,
  id: string,
  apply: (battery: BatteryLevel) => boolean,
  create = false,
): boolean {
  const existing = state.batteries.find((battery) => battery.id === id);
  if (!existing && !create) return false;
  const battery = existing ?? {
    id,
    name: null,
    voltage: null,
    current: null,
    temperatureC: null,
    stateOfCharge: null,
  };
  const changed = apply(battery);
  if (!existing && changed) state.batteries.push(battery);
  return changed;
}

function assign<T, K extends keyof T>(target: T, key: K, value: T[K]): boolean {
  if (target[key] === value) return false;
  target[key] = value;
  return true;
}

function tanksInKind(state: LevelsState, kind: TankKind): TankLevel[] {
  return state.tanks.filter((tank) => tank.kind === kind).sort((a, b) => compareInstance(a.id, b.id));
}

function compareInstance(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  return a.localeCompare(b);
}

function tankKindTitle(kind: TankKind): string {
  switch (kind) {
    case 'fuel':
      return 'Fuel tank';
    case 'freshWater':
      return 'Fresh water tank';
    case 'blackWater':
      return 'Black water tank';
  }
}

function stripVessel(path: string): string {
  return path.replace(/^self\./, '').replace(/^vessels\.[^.]+\./, '');
}
