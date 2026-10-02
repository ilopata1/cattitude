import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { formatCurrentSails } from '../guide/current-sail';
import { enginesRunning } from '../logbook/logbook-ingest';
import {
  bearingDeg,
  beaufortFromKnots,
  coreStaleFields,
  derivePropulsion,
  destinationDistanceNm,
  etaIso,
  meanSog,
  readingUsable,
  sailsUp,
  summarizeTrack,
  vmgKnots,
} from '../logbook/logbook-math';
import {
  LogCorrection,
  LogEntry,
  LogTrigger,
  LogbookSettings,
  Passage,
  PassageWaypoint,
  DEFAULT_LOGBOOK_SETTINGS,
} from '../models/logbook.model';
import { CurrentSailService } from './current-sail.service';
import { LogbookSamplerService } from './logbook-sampler.service';
import { LogbookStoreService } from './logbook-store.service';
import { LogbookSyncService } from './logbook-sync.service';
import { PolarService } from './polar.service';
import { SailPlanService } from './sail-plan.service';

export interface LogRecordOptions {
  remarks?: string;
  waypointId?: string;
  /** User actions log even when Signal K has nothing to say. */
  force?: boolean;
}

const AUTOMATIC = new Set<LogTrigger>([
  'interval',
  'propulsion-change',
  'sail-change',
  'waypoint',
  'departure',
  'arrival',
]);

@Injectable({ providedIn: 'root' })
export class LogbookService {
  private readonly store = inject(LogbookStoreService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly sync = inject(LogbookSyncService);
  private readonly sails = inject(CurrentSailService);
  private readonly sailPlans = inject(SailPlanService);
  private readonly polar = inject(PolarService);

  readonly entries$ = new BehaviorSubject<LogEntry[]>([]);
  readonly passage$ = new BehaviorSubject<Passage | null>(null);
  readonly settings$ = new BehaviorSubject<LogbookSettings>(DEFAULT_LOGBOOK_SETTINGS);

  private ready: Promise<void> | null = null;
  private tail: Promise<unknown> = Promise.resolve();

  ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = this.load().catch(err => {
        this.ready = null;
        throw err;
      });
    }
    return this.ready;
  }

  record(trigger: LogTrigger, options: LogRecordOptions = {}): Promise<LogEntry | null> {
    const run = this.tail.then(() => this.recordNow(trigger, options));
    this.tail = run.then(() => undefined, () => undefined);
    return run;
  }

  async correct(
    id: string,
    patch: Partial<Pick<LogEntry, 'remarks' | 'seaState' | 'cloudOktas' | 'visibilityNm' | 'watch'>>,
  ): Promise<void> {
    await this.ensureReady();
    const current = this.entries$.value.find(entry => entry.id === id);
    if (!current) return;
    const now = new Date().toISOString();
    const corrections = [...current.corrections];
    const next: LogEntry = { ...current, updatedAt: now };
    for (const field of ['remarks', 'seaState', 'cloudOktas', 'visibilityNm', 'watch'] as const) {
      if (patch[field] === undefined || patch[field] === current[field]) continue;
      corrections.push({
        at: now,
        field,
        from: current[field],
        to: patch[field],
        by: 'crew',
      } satisfies LogCorrection);
      (next[field] as LogEntry[typeof field]) = patch[field] as never;
    }
    if (corrections.length === current.corrections.length) return;
    next.corrections = corrections;
    await this.persist(next);
  }

  async savePassage(passage: Passage): Promise<void> {
    await this.ensureReady();
    const previous = this.passage$.value;
    const next: Passage = { ...passage, updatedAt: new Date().toISOString() };
    await this.store.savePassage(next);
    await this.store.markPassageDirty(true);
    this.passage$.next(next);
    this.sync.schedule();
    if (previous && previous.watch.trim() !== next.watch.trim() && next.departedAt) {
      await this.record('watch-change');
    }
  }

  async saveSettings(settings: LogbookSettings): Promise<void> {
    await this.ensureReady();
    const stored = await this.store.settings();
    const next = { ...stored, ...settings };
    await this.store.saveSettings(next);
    const normalized = await this.store.settings();
    this.settings$.next(normalized);
  }

  private async load(): Promise<void> {
    const settings = await this.store.settings();
    this.settings$.next(settings);
    const pulled = await this.sync.pull();
    this.entries$.next(pulled.entries);
    this.passage$.next(pulled.passage);
  }

  private async recordNow(trigger: LogTrigger, options: LogRecordOptions): Promise<LogEntry | null> {
    await this.ensureReady();
    const nowMs = Date.now();
    const reading = this.sampler.snapshot;
    if (AUTOMATIC.has(trigger) && !options.force && !readingUsable(reading)) return null;

    const passage = this.passage$.value;
    const selection = this.sails.selection();
    const sailLabel = formatCurrentSails(selection);
    let waypoint: PassageWaypoint | null = null;
    if (trigger === 'waypoint') {
      waypoint = passage?.waypoints.find(item => item.id === options.waypointId && !item.passedAt) ?? null;
      if (!waypoint) return null;
    }

    const previous = this.entries$.value[0] ?? null;
    const sinceEntryMs = previous ? Date.parse(previous.at) : nowMs;
    const lastWaypoint = [...(passage?.waypoints ?? [])].reverse().find(item => item.passedAt);
    const sinceWaypointMs = lastWaypoint?.passedAt
      ? Date.parse(lastWaypoint.passedAt)
      : passage?.departedAt
        ? Date.parse(passage.departedAt)
        : sinceEntryMs;
    const sinceEntry = summarizeTrack(
      this.sampler.samplesSince(Math.min(sinceEntryMs, nowMs - 3 * 3_600_000)),
      Number.isFinite(sinceEntryMs) ? sinceEntryMs : nowMs,
      nowMs,
      reading.pressureHpa,
    );
    const sinceWaypoint = summarizeTrack(
      this.sampler.samplesSince(Number.isFinite(sinceWaypointMs) ? sinceWaypointMs : nowMs),
      Number.isFinite(sinceWaypointMs) ? sinceWaypointMs : nowMs,
      nowMs,
      reading.pressureHpa,
    );

    const position = reading.position;
    const dtg = destinationDistanceNm(position, passage);
    const from = previous?.position ?? sinceEntry.fromPosition;
    const groundNm = sinceEntry.groundNm;
    const hours = previous ? Math.max((nowMs - Date.parse(previous.at)) / 3_600_000, 1 / 60) : null;
    const cmg = from && position ? bearingDeg(from, position) : null;
    const smg = groundNm != null && hours ? Math.round((groundNm / hours) * 10) / 10 : null;
    const destPoint = passage && passage.destinationLat != null && passage.destinationLon != null && position
      ? { lat: passage.destinationLat, lon: passage.destinationLon }
      : null;
    const bearingToDest = position && destPoint ? bearingDeg(position, destPoint) : null;
    const recentSog = this.entries$.value.slice(0, 3).map(entry => entry.sogKn);
    const eta = etaIso(dtg, meanSog(recentSog.length ? recentSog : [reading.sogKn]), nowMs);
    const logNm = logDeltaNm(previous?.tripLogM ?? null, reading.tripLogM) ?? sinceEntry.logNm;

    const average = this.polar.windows[15];
    const advice = this.sailPlans.advise(average.twaDeg, average.twsKnots, average.polarPct);
    const recommended = advice && !advice.empty ? advice.primary : null;
    const propulsion = derivePropulsion({
      navState: reading.navState,
      enginesRunning: enginesRunning(reading),
      sailsUp: sailsUp(selection.main, selection.headsail),
      sogKn: reading.sogKn,
    });
    const at = new Date(nowMs).toISOString();
    const entry: LogEntry = {
      id: newId(),
      passageId: passage?.id ?? null,
      at,
      updatedAt: at,
      zoneOffsetMin: -new Date(nowMs).getTimezoneOffset(),
      trigger,
      position: position && reading.positionAt
        ? { lat: position.lat, lon: position.lon, fixAt: reading.positionAt }
        : null,
      headingTrueDeg: round(reading.headingTrueDeg),
      cogDeg: round(reading.cogDeg),
      sogKn: round(reading.sogKn),
      stwKn: round(reading.stwKn),
      depthM: round(reading.depthM),
      wind: {
        twsKn: round(reading.twsKn),
        twdDeg: round(reading.twdDeg),
        twaDeg: round(reading.twaDeg),
        awsKn: round(reading.awsKn),
        awaDeg: round(reading.awaDeg),
        meanTwsSinceLastKn: sinceEntry.meanTwsKn,
        gustSinceLastKn: sinceEntry.gustSinceKn,
        gust10mKn: sinceEntry.gust10mKn,
        beaufort: beaufortFromKnots(reading.twsKn),
      },
      pressureHpa: reading.pressureHpa,
      pressureTrend3hHpa: sinceEntry.pressureTrend3hHpa,
      airTempC: reading.airTempC,
      seaTempC: reading.seaTempC,
      current: { setDeg: round(reading.setDeg), driftKn: round(reading.driftKn) },
      propulsion: {
        state: propulsion,
        engines: reading.engines.map(engine => ({
          id: engine.id,
          rpm: engine.rpm,
          hours: engine.hours,
        })),
      },
      sails: {
        main: selection.main,
        headsail: selection.headsail,
        label: sailLabel,
        recommended,
      },
      distances: {
        sinceLastEntryGroundNm: groundNm,
        sinceLastEntryLogNm: logNm,
        sinceLastWaypointNm: passage ? sinceWaypoint.groundNm : null,
        toDestinationNm: dtg,
        cmgDeg: cmg == null ? null : Math.round(cmg),
        smgKn: smg,
        vmgKn: vmgKnots(reading.sogKn, reading.cogDeg, bearingToDest),
        etaUtc: eta,
      },
      ship: {
        batteries: reading.batteries.map(battery => ({ ...battery })),
        tanks: reading.tanks.map(tank => ({ ...tank })),
      },
      tripLogM: reading.tripLogM,
      watch: passage?.watch?.trim() || null,
      seaState: null,
      cloudOktas: null,
      visibilityNm: null,
      remarks: (options.remarks || '').trim(),
      staleFields: coreStaleFields(reading, nowMs),
      corrections: [],
    };

    await this.persist(entry);
    if (passage && (trigger === 'departure' || trigger === 'arrival' || waypoint)) {
      const updated = applyPassageEvent(passage, trigger, at, waypoint?.id ?? null);
      if (updated !== passage) {
        await this.store.savePassage(updated);
        await this.store.markPassageDirty(true);
        this.passage$.next(updated);
      }
    }
    this.sync.schedule();
    return entry;
  }

  private async persist(entry: LogEntry): Promise<void> {
    await this.store.saveEntry(entry);
    await this.store.markDirty(entry.id);
    const rest = this.entries$.value.filter(item => item.id !== entry.id);
    this.entries$.next([entry, ...rest].sort((a, b) => b.at.localeCompare(a.at)));
  }
}

function applyPassageEvent(
  passage: Passage,
  trigger: LogTrigger,
  at: string,
  waypointId: string | null,
): Passage {
  if (trigger === 'departure' && !passage.departedAt) {
    return { ...passage, departedAt: at, updatedAt: at };
  }
  if (trigger === 'arrival' && !passage.arrivedAt) {
    return { ...passage, arrivedAt: at, updatedAt: at };
  }
  if (trigger === 'waypoint' && waypointId) {
    return {
      ...passage,
      updatedAt: at,
      waypoints: passage.waypoints.map(item => (
        item.id === waypointId ? { ...item, passedAt: at } : item
      )),
    };
  }
  return passage;
}

function logDeltaNm(previousM: number | null, currentM: number | null): number | null {
  if (previousM == null || currentM == null) return null;
  const delta = currentM - previousM;
  if (delta < 0) return null;
  return Math.round((delta / 1852) * 10) / 10;
}

function round(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
