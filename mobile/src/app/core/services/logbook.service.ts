import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { formatCurrentSails } from '../guide/current-sail';
import { enginesRunning } from '../logbook/logbook-ingest';
import { BoatPart, BoatRevs, boatAction } from '../logbook/logbook-remote';
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
import { wallNowMs } from '../wall-time';
import { CurrentSailService } from './current-sail.service';
import { DutyRotaService } from './duty-rota.service';
import { HouseBatterySettingsService } from './house-battery-settings.service';
import { LogbookRemoteService, RecorderContext } from './logbook-remote.service';
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

/** The boat recorder writes these. A phone never stores its own copy. */
const BOAT_ONLY = new Set<LogTrigger>([
  'interval',
  'propulsion-change',
  'sail-change',
  'watch-change',
]);

const BOAT_PARTS: BoatPart[] = ['settings', 'passage', 'rota', 'sails', 'alerts'];
/** History fetched from the boat on first contact: enough for the 24 h progress figure. */
const TRACK_HISTORY_MS = 25 * 3_600_000;
const TRACK_HISTORY_STEP_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class LogbookService {
  private readonly store = inject(LogbookStoreService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly sync = inject(LogbookSyncService);
  private readonly remote = inject(LogbookRemoteService);
  private readonly sails = inject(CurrentSailService);
  private readonly sailPlans = inject(SailPlanService);
  private readonly polar = inject(PolarService);
  private readonly duty = inject(DutyRotaService);
  private readonly houseBattery = inject(HouseBatterySettingsService);

  readonly entries$ = new BehaviorSubject<LogEntry[]>([]);
  readonly passage$ = new BehaviorSubject<Passage | null>(null);
  readonly settings$ = new BehaviorSubject<LogbookSettings>(DEFAULT_LOGBOOK_SETTINGS);

  private ready: Promise<void> | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  /** Boat revisions this device last took or wrote. Null until the first status read. */
  private knownRevs: BoatRevs | null = null;

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
    const run = this.tail.then(async () => {
      await this.noteDutyWatch();
      return this.recordNowOrRemote(trigger, options);
    });
    this.tail = run.then(() => undefined, () => undefined);
    return run;
  }

  /**
   * Keep this device's passage watch in step with the duty rota.
   * The boat recorder writes the watch-change row from the rota it was sent.
   */
  syncWatchFromDuty(): Promise<void> {
    const run = this.tail.then(() => this.noteDutyWatch());
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
    if (this.remote.recording()) {
      const saved = await this.remote.correct(id, {
        remarks: next.remarks,
        seaState: next.seaState,
        cloudOktas: next.cloudOktas,
        visibilityNm: next.visibilityNm,
        watch: next.watch,
      });
      if (saved) {
        await this.persist(saved);
        return;
      }
    }
    await this.persist(next);
  }

  async savePassage(passage: Passage): Promise<void> {
    await this.writePassage(passage, true);
  }

  /**
   * The passage watch is the person currently on the duty rota's watch task.
   * The boat recorder logs the handover. This device only stores and publishes it.
   */
  private async writePassage(passage: Passage, publish: boolean): Promise<void> {
    await this.ensureReady();
    if (this.duty.hasVessel()) await this.duty.whenReady();
    const next: Passage = {
      ...passage,
      watch: this.duty.hasVessel() ? this.dutyWatch() : passage.watch,
      updatedAt: new Date().toISOString(),
    };
    await this.store.savePassage(next);
    await this.store.markPassageDirty(true);
    this.passage$.next(next);
    this.sync.schedule();
    if (publish) await this.publishContext(['passage']);
  }

  private async noteDutyWatch(): Promise<void> {
    if (!this.duty.hasVessel()) return;
    await this.duty.whenReady();
    const passage = this.passage$.value;
    if (!passage) return;
    const watch = this.dutyWatch();
    if (passage.watch.trim() === watch) return;
    // The boat writes the watch from its own rota, so this only updates this device.
    await this.writePassage({ ...passage, watch }, false);
  }

  private dutyWatch(): string {
    return this.duty.assigneeName('watch')?.trim() ?? '';
  }

  private passageForBoat(): Passage | null {
    const passage = this.passage$.value;
    if (!passage || !this.duty.hasVessel()) return passage;
    const watch = this.dutyWatch();
    return passage.watch === watch ? passage : { ...passage, watch };
  }

  private entryWatch(passage: Passage | null): string | null {
    if (!this.duty.hasVessel()) return passage?.watch?.trim() || null;
    return this.dutyWatch() || null;
  }

  async saveSettings(settings: LogbookSettings): Promise<void> {
    await this.ensureReady();
    const stored = await this.store.settings();
    const next = { ...stored, ...settings };
    await this.store.saveSettings(next);
    const normalized = await this.store.settings();
    this.settings$.next(normalized);
    await this.publishContext(['settings']);
  }

  /**
   * Send the parts this device changed to the boat recorder. Each part carries the boat
   * revision it was based on, so the boat refuses it when another device changed it first.
   * The refused parts are replaced here with the boat's copy.
   */
  async publishContext(parts: BoatPart[] = BOAT_PARTS): Promise<void> {
    if (this.duty.hasVessel()) await this.duty.whenReady();
    if (!this.knownRevs) {
      await this.remote.refresh();
      if (this.remote.revs()) await this.syncFromBoat(false);
    }
    const recommended = this.recommendedSail();
    const context: RecorderContext = { recommended };
    const baseRevs: Partial<Record<BoatPart, number>> = {};
    const sent: BoatPart[] = [];
    for (const part of parts) {
      if (part === 'settings') context.settings = this.settings$.value;
      else if (part === 'passage') context.passage = this.passageForBoat();
      else if (part === 'rota') {
        if (!this.duty.hasVessel()) continue;
        context.rota = this.duty.rota();
        context.wallOffsetMs = wallNowMs() - Date.now();
      } else if (part === 'sails') {
        const selection = this.sails.selection();
        context.sails = { main: selection.main, headsail: selection.headsail, recommended };
      } else if (part === 'alerts') {
        context.alerts = { houseBatteryPercent: this.houseBattery.percent };
      }
      sent.push(part);
      if (this.knownRevs) baseRevs[part] = this.knownRevs[part];
    }
    if (this.knownRevs) context.baseRevs = baseRevs;
    const result = await this.remote.publish(context);
    const revs = this.remote.revs();
    if (!result || !revs || !this.knownRevs) return;
    const refused = new Set(result.conflicts);
    for (const part of sent) {
      if (!refused.has(part)) this.knownRevs[part] = revs[part];
    }
    if (refused.size) await this.adoptFromBoat([...refused], revs);
  }

  /** Only the polar advice, which the boat stamps on each row. Not versioned. */
  async publishAdvice(): Promise<void> {
    if (!this.knownRevs) return;
    await this.remote.publish({ recommended: this.recommendedSail() });
  }

  /**
   * Take what other devices changed on the boat since this device last looked, and give
   * the boat back anything it lost. Call after `remote.refresh()`.
   */
  async syncFromBoat(allowResend = true): Promise<void> {
    const revs = this.remote.revs();
    if (!revs) return;
    if (this.duty.hasVessel()) await this.duty.whenReady();
    const known = this.knownRevs;
    const adopt: BoatPart[] = [];
    const resend: BoatPart[] = [];
    for (const part of BOAT_PARTS) {
      const action = !known && revs[part] === 0 && this.hasLocal(part)
        ? 'resend'
        : boatAction(known ? known[part] : null, revs[part]);
      if (action === 'adopt') adopt.push(part);
      else if (action === 'resend') resend.push(part);
    }
    const entriesChanged = !known || known.entries !== revs.entries;
    this.knownRevs = { ...revs };
    await this.adoptFromBoat(adopt, revs);
    if (entriesChanged) await this.absorbBoatEntries();
    if (resend.length && allowResend) await this.publishContext(resend);
  }

  private hasLocal(part: BoatPart): boolean {
    if (part === 'passage') return !!this.passage$.value;
    if (part === 'rota') return this.duty.hasVessel() && this.duty.named().length > 0;
    if (part === 'sails') {
      const selection = this.sails.selection();
      return !!(selection.main || selection.headsail);
    }
    if (part === 'alerts') return this.houseBattery.isSaved();
    return false;
  }

  private async adoptFromBoat(parts: BoatPart[], revs: BoatRevs): Promise<void> {
    for (const part of parts) {
      if (part === 'passage') {
        const passage = this.remote.passage();
        if (passage) {
          await this.store.savePassage(passage);
          // Relay the boat's passage, with its departure and waypoint times, to Railway.
          await this.store.markPassageDirty(true);
          this.passage$.next(passage);
          this.sync.schedule();
        }
      } else if (part === 'settings') {
        const settings = this.remote.serverSettings();
        if (settings) {
          await this.store.saveSettings(settings);
          this.settings$.next(await this.store.settings());
        }
      } else if (part === 'rota') {
        const rota = this.remote.boatRota();
        if (rota) this.duty.adoptFromBoat(rota);
      } else if (part === 'sails') {
        const sails = this.remote.boatSails();
        if (sails) this.sails.adopt(sails);
      } else if (part === 'alerts') {
        const alerts = this.remote.boatAlerts();
        if (alerts) this.houseBattery.adopt(alerts.houseBatteryPercent);
      }
      if (this.knownRevs) this.knownRevs[part] = revs[part];
    }
  }

  /**
   * Fetch the boat's track since this device last did, so progress figures and rows
   * written on this device cover the hours when it was closed.
   */
  async syncBoatTrack(): Promise<void> {
    const latest = this.sampler.latestBoatAt();
    const samples = latest
      ? await this.remote.track(latest - this.remote.trackOffsetMs)
      : await this.remote.track(Date.now() - TRACK_HISTORY_MS, TRACK_HISTORY_STEP_MS);
    if (samples) this.sampler.absorbBoat(samples);
  }

  private recommendedSail(): string | null {
    const average = this.polar.windows[15];
    const advice = this.sailPlans.advise(average.twaDeg, average.twsKnots, average.polarPct);
    return advice && !advice.empty ? advice.primary : null;
  }

  /**
   * Fetch what other devices sent to Railway, and what the boat holds, again.
   * Safe to call often. Does nothing until the logbook has loaded once.
   */
  async refreshShared(): Promise<void> {
    if (!this.ready) return;
    await this.ready;
    const run = this.tail.then(async () => {
      const pulled = await this.sync.pull(true);
      this.entries$.next(pulled.entries);
      if (!this.remote.revs()) this.passage$.next(pulled.passage);
      await this.remote.refresh();
      if (this.remote.revs()) await this.syncFromBoat();
    });
    this.tail = run.then(() => undefined, () => undefined);
    await run;
  }

  private async load(): Promise<void> {
    const settings = await this.store.settings();
    this.settings$.next(settings);
    const pulled = await this.sync.pull();
    this.entries$.next(pulled.entries);
    this.passage$.next(pulled.passage);
    await this.remote.refresh();
    if (this.remote.revs()) await this.syncFromBoat(false);
    else await this.absorbBoat();
  }

  private async recordNowOrRemote(
    trigger: LogTrigger,
    options: LogRecordOptions,
  ): Promise<LogEntry | null> {
    await this.ensureReady();
    if (this.remote.recording()) {
      const remote = await this.remote.record(trigger, options);
      if (remote) {
        await this.persist(remote);
        await this.remote.refresh();
        if (this.remote.revs()) await this.syncFromBoat(false);
        else await this.absorbBoat();
        return remote;
      }
      if (remote === null) return null;
    }
    if (BOAT_ONLY.has(trigger)) return null;
    return this.recordNow(trigger, options);
  }

  /** For a recorder without revisions: rows, passage and settings from the boat. */
  private async absorbBoat(): Promise<void> {
    if (!(await this.absorbBoatEntries())) return;
    const passage = this.remote.passage();
    if (passage && !(await this.store.passageDirty())) {
      await this.store.savePassage(passage);
      this.passage$.next(passage);
    }
    const settings = this.remote.serverSettings();
    if (settings) {
      await this.store.saveSettings(settings);
      this.settings$.next(await this.store.settings());
    }
  }

  /** Boat rows replace this device's copy, then Railway receives anything new. False when the boat could not be read. */
  private async absorbBoatEntries(): Promise<boolean> {
    const boat = await this.remote.pullEntries();
    if (!boat) return false;
    const dirty = new Set(await this.store.dirtyIds());
    const byId = new Map(this.entries$.value.map(entry => [entry.id, entry]));
    let changed = false;
    for (const entry of boat) {
      const have = byId.get(entry.id);
      if (!have) {
        await this.store.saveEntry(entry);
        await this.store.markDirty(entry.id);
        byId.set(entry.id, entry);
        changed = true;
      } else if (!dirty.has(entry.id) && entry.updatedAt > have.updatedAt) {
        await this.store.saveEntry(entry);
        await this.store.markDirty(entry.id);
        byId.set(entry.id, entry);
        changed = true;
      }
    }
    if (changed) {
      this.entries$.next([...byId.values()].sort((a, b) => b.at.localeCompare(a.at)));
      this.sync.schedule();
    }
    return true;
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
      watch: this.entryWatch(passage),
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
