/**
 * AnchorageVesselStoreService
 *
 * Adapts Cattitude's SignalKService delta stream into vessel tracking state
 * for the anchorage neighbour-conflict page.
 *
 * Signal-K contexts:
 *   vessels.<urn>  → own vessel or other vessels
 *   atons.*        → Aids to Navigation (ignored)
 *
 * Paths consumed (per context):
 *   navigation.position          → { latitude, longitude }
 *   navigation.speedOverGround   → SOG in m/s  (converted to knots)
 *   navigation.headingTrue       → true heading (radians, converted to degrees)
 *   navigation.courseOverGround  → COG (radians)
 *   navigation.mmsi              → MMSI string
 *   name                         → vessel name
 *   design.length.value          → LOA in metres
 *   design.beam.value            → beam in metres
 */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { SignalKService, SignalKDelta } from '../../../../core/services/signal-k.service';
import { NotificationBridgeService } from '../../../../core/services/notification-bridge.service';
import { AnchorageSettingsService } from './anchorage-settings.service';
import { AnchorageAlertService } from './anchorage-alert.service';
import { AnchoragePersistenceService } from './anchorage-persistence.service';
import {
  Vessel, VesselUpdate, VesselPosition, LatLon,
} from '../models/vessel.model';
import {
  computeAnchorPoint, computeSwingRadius, computeState,
  applyWindRangeToAnchoredState, haversineDistance,
} from '../calculators/anchor.calculator';

const SOG_THRESHOLD         = 0.5;     // knots — below this we treat vessel as at anchor
const COG_SOG_THRESHOLD     = 0.3;     // knots — use COG as heading only above this
const POSITION_MAX_AGE_MS   = 24 * 60 * 60 * 1000;
const VESSEL_REMOVE_AGE_MS  = 60 * 60 * 1000;
const STALE_THRESHOLD_MS    = 15 * 60 * 1000;
const MPS_TO_KNOTS          = 1.94384;
const RAD_TO_DEG            = 180 / Math.PI;
const PERSIST_EVERY_N_UPDATES = 25;

/** Partial accumulator while we wait for all paths to arrive for a context. */
interface VesselPartial {
  mmsi?: string;
  name?: string;
  lat?: number;
  lon?: number;
  sogKnots?: number;
  headingDeg?: number;
  cogDeg?: number;
  lengthM?: number;
  beamM?: number;
  lastSeen: number;
}

@Injectable({ providedIn: 'root' })
export class AnchorageVesselStoreService implements OnDestroy {

  private readonly vesselMap    = new BehaviorSubject<Map<string, Vessel>>(new Map());
  private readonly partials     = new Map<string, VesselPartial>();
  private sub: Subscription | null = null;
  private hydrateSub: Subscription | null = null;
  private hydrateTimer: ReturnType<typeof setInterval> | null = null;
  private recording             = false;
  private ownContext            = '';    // e.g. "vessels.urn:mrn:imo:mmsi:123"
  private persistCounter        = 0;
  private restored              = false;

  readonly vessels$: Observable<Vessel[]> = this.vesselMap.pipe(
    map(m => Array.from(m.values())),
  );

  constructor(
    private readonly sk: SignalKService,
    private readonly settings: AnchorageSettingsService,
    private readonly alerts: AnchorageAlertService,
    private readonly persistence: AnchoragePersistenceService,
    private readonly notifications: NotificationBridgeService,
  ) {
    // Track own context from SK hello.
    this.sk.self$.subscribe(self => {
      this.ownContext = self.startsWith('vessels.') ? self : self ? `vessels.${self}` : '';
    });
    this.settings.settings$.subscribe(() => this.recalculateStates());
  }

  // ---------------------------------------------------------------------------
  // Public API

  startRecording(): void {
    this.recording = true;
    void this.ensureRestored();
    void this.hydrateFromRest();
  }

  stopRecording(): void {
    this.recording = false;
    void this.persistence.saveSnapshot(Array.from(this.vesselMap.value.values()));
    const current = new Map(this.vesselMap.value);
    for (const v of current.values()) {
      if (v.positions.length > 0) v.positions = [v.positions[v.positions.length - 1]];
      v.anchorPoint  = null;
      v.swingRadius  = 0;
      v.confidence   = 'low';
      v.state        = 'unknown';
      v.tracked      = false;
    }
    this.vesselMap.next(current);
    this.alerts.clear();
  }

  get isRecording(): boolean { return this.recording; }

  /** Start consuming Signal-K deltas and hydrate names from the REST API. */
  start(): void {
    this.stop();
    this.sub = this.sk.delta$.subscribe(delta => this.handleDelta(delta));
    this.hydrateSub = this.sk.connected$.subscribe(connected => {
      if (connected) void this.hydrateFromRest();
    });
    if (this.sk.state === 'connected') void this.hydrateFromRest();
    this.hydrateTimer = setInterval(() => {
      if (this.sk.state === 'connected') void this.hydrateFromRest();
    }, 60_000);
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.sub = null;
    this.hydrateSub?.unsubscribe();
    this.hydrateSub = null;
    if (this.hydrateTimer !== null) {
      clearInterval(this.hydrateTimer);
      this.hydrateTimer = null;
    }
  }

  clear(): void {
    this.vesselMap.next(new Map());
    this.partials.clear();
    this.alerts.clear();
    void this.persistence.clear();
  }

  /** Merge persisted tracks into memory (once per session). */
  async ensureRestored(): Promise<void> {
    if (this.restored) return;
    this.restored = true;
    const stored = await this.persistence.loadRecentVessels();
    if (stored.length === 0) return;
    const current = new Map(this.vesselMap.value);
    for (const v of stored) {
      if (!current.has(v.mmsi)) current.set(v.mmsi, v);
    }
    this.vesselMap.next(current);
    this.recalculateStates();
  }

  ngOnDestroy(): void { this.stop(); }

  // ---------------------------------------------------------------------------

  private handleDelta(delta: SignalKDelta): void {
    let ctx = delta.context ?? '';
    if (!ctx.startsWith('vessels.')) return;
    // Own-boat deltas often use vessels.self while AIS targets use the MMSI URN.
    if (ctx === 'vessels.self' && this.ownContext) ctx = this.ownContext;

    const partial = this.getOrCreatePartial(ctx);
    partial.lastSeen = Date.now();
    let nameTouched = false;

    for (const update of delta.updates ?? []) {
      for (const kv of update.values ?? []) {
        const path = relativeSkPath(kv.path, ctx);
        this.applyPath(partial, path, kv.value);
        if (path === 'name' || path.endsWith('.name')) nameTouched = true;
      }
    }

    if (nameTouched && partial.name) {
      this.applyNameIfKnown(ctx, partial);
    }

    // Flush when we have a fix. SOG is optional — AIS targets often omit it briefly.
    if (partial.lat !== undefined && partial.lon !== undefined) {
      if (partial.sogKnots === undefined) partial.sogKnots = 0;
      this.flushPartial(ctx, partial);
    }
  }

  private applyPath(p: VesselPartial, path: string, value: unknown): void {
    switch (path) {
      case 'navigation.position': {
        const pos = value as { latitude?: number; longitude?: number } | null;
        if (pos?.latitude !== undefined) p.lat = pos.latitude;
        if (pos?.longitude !== undefined) p.lon = pos.longitude;
        break;
      }
      case 'navigation.speedOverGround':
        if (typeof value === 'number') p.sogKnots = value * MPS_TO_KNOTS;
        break;
      case 'navigation.headingTrue':
        if (typeof value === 'number') p.headingDeg = value * RAD_TO_DEG;
        break;
      case 'navigation.courseOverGroundTrue':
      case 'navigation.courseOverGround':
        if (typeof value === 'number') p.cogDeg = value * RAD_TO_DEG;
        break;
      case 'mmsi':
      case 'navigation.mmsi':
        if (typeof value === 'string' || typeof value === 'number') p.mmsi = String(value);
        break;
      case 'design.length.overall':
        if (typeof value === 'number') p.lengthM = value;
        break;
      case 'design.length.value':
      case 'design.length':
        if (typeof value === 'number') p.lengthM = value;
        else if (value && typeof value === 'object' && typeof (value as { overall?: number }).overall === 'number') {
          p.lengthM = (value as { overall: number }).overall;
        }
        break;
      case 'design.beam.maximum':
        if (typeof value === 'number') p.beamM = value;
        break;
      case 'design.beam.value':
      case 'design.beam':
        if (typeof value === 'number') p.beamM = value;
        else if (value && typeof value === 'object' && typeof (value as { maximum?: number }).maximum === 'number') {
          p.beamM = (value as { maximum: number }).maximum;
        }
        break;
      default:
        if (path === 'name' || path.endsWith('.name')) {
          const name = coerceVesselName(value);
          if (name) p.name = name;
        }
        break;
    }
  }

  private flushPartial(ctx: string, partial: VesselPartial): void {
    const mmsi = partial.mmsi ?? this.mmsiFromContext(ctx);

    const heading = partial.headingDeg
      ?? ((partial.cogDeg !== undefined && (partial.sogKnots ?? 0) > COG_SOG_THRESHOLD)
          ? partial.cogDeg : undefined)
      ?? 0;

    const update: VesselUpdate = {
      mmsi,
      name: partial.name,
      lat: partial.lat!,
      lon: partial.lon!,
      sog: partial.sogKnots!,
      heading,
      lengthMetres: partial.lengthM,
      beamMetres: partial.beamM,
      timestamp: partial.lastSeen,
    };

    this.processUpdate(update, ctx === this.ownContext || mmsi === this.ownMmsi());
  }

  /** Name often arrives in a separate AIS static-data delta — apply it without waiting for another position. */
  private applyNameIfKnown(ctx: string, partial: VesselPartial): void {
    const mmsi = partial.mmsi ?? this.mmsiFromContext(ctx);
    if (!mmsi || !partial.name) return;
    const current = new Map(this.vesselMap.value);
    const vessel = current.get(mmsi);
    if (!vessel || vessel.name === partial.name) return;
    vessel.name = partial.name;
    this.vesselMap.next(current);
  }

  private processUpdate(update: VesselUpdate, isOwn: boolean): void {
    const s = this.settings.get();
    const monCentre = s.monitoringCentre
      ?? this.currentOwnPosition();

    const isTracked = this.recording && isWithinRadius(update.lat, update.lon, monCentre, s.trackingRadiusM);

    const current = new Map(this.vesselMap.value);
    let vessel = current.get(update.mmsi);

    const position: VesselPosition = {
      lat: update.lat, lon: update.lon,
      heading: update.heading ?? 0,
      sog: update.sog,
      timestamp: update.timestamp,
    };

    if (!vessel) {
      vessel = {
        mmsi: update.mmsi,
        name: update.name ?? update.mmsi,
        lengthMetres: update.lengthMetres ?? 10,
        beamMetres: update.beamMetres ?? 3,
        positions: [],
        anchorPoint: null,
        swingRadius: 0,
        confidence: 'low',
        state: 'unknown',
        isOwn,
        lastUpdated: update.timestamp,
        tracked: isTracked,
      };
    }

    if (update.name) vessel.name = update.name;
    if (update.lengthMetres) vessel.lengthMetres = update.lengthMetres;
    if (update.beamMetres) vessel.beamMetres = update.beamMetres;
    vessel.lastUpdated = update.timestamp;
    vessel.isOwn = isOwn;
    vessel.tracked = isTracked;

    if (isTracked) {
      vessel.positions.push(position);
      vessel.positions = prunePositions(vessel.positions);

      const anchorPos = vessel.positions.filter(p => p.sog < SOG_THRESHOLD);
      if (anchorPos.length >= 2) {
        vessel.anchorPoint = computeAnchorPoint(anchorPos);
        if (vessel.anchorPoint) {
          vessel.swingRadius = computeSwingRadius(vessel.anchorPoint, anchorPos, vessel.lengthMetres);
        }
      }
      vessel.confidence = computeConfidence(anchorPos.length);
    } else {
      vessel.positions = [position];
      vessel.anchorPoint = null;
      vessel.swingRadius = 0;
      vessel.confidence = 'low';
      vessel.state = 'unknown';
    }

    current.set(update.mmsi, vessel);

    // Evict stale vessels.
    const now = Date.now();
    for (const [mmsi, v] of current) {
      if (now - v.lastUpdated > VESSEL_REMOVE_AGE_MS) current.delete(mmsi);
    }

    this.vesselMap.next(current);
    this.recalculateStates();

    if (this.recording && isTracked) {
      this.persistCounter += 1;
      if (this.persistCounter >= PERSIST_EVERY_N_UPDATES) {
        this.persistCounter = 0;
        void this.persistence.saveSnapshot(Array.from(this.vesselMap.value.values()));
      }
    }
  }

  private recalculateStates(): void {
    const current   = new Map(this.vesselMap.value);
    const tracked   = Array.from(current.values()).filter(v => v.tracked);
    const s         = this.settings.get();

    for (const vessel of current.values()) {
      if (!vessel.tracked) { vessel.state = 'unknown'; continue; }
      const recent = vessel.positions[vessel.positions.length - 1];
      if (recent && recent.sog >= SOG_THRESHOLD) { vessel.state = 'moving'; continue; }
      const base = computeState(vessel, tracked);
      vessel.state = applyWindRangeToAnchoredState(
        base, vessel, tracked,
        s.windUseInSwingCalculations,
        s.windRangeStartDeg, s.windRangeEndDeg,
      );
    }
    this.vesselMap.next(current);
    this.alerts.evaluateAlerts(Array.from(current.values()));
    for (const alert of this.alerts.consumeNewlyRaised()) {
      const title = alert.state === 'red' ? 'Anchorage collision risk' : 'Anchorage rode conflict';
      const body = alert.type === 'collision'
        ? `${alert.vesselName} and ${alert.otherName}`
        : `${alert.vesselName} near ${alert.otherName}`;
      this.notifications.notifyAppEvent(`anchorage.${alert.id}`, title, body);
    }
  }

  private getOrCreatePartial(ctx: string): VesselPartial {
    let p = this.partials.get(ctx);
    if (!p) { p = { lastSeen: Date.now() }; this.partials.set(ctx, p); }
    return p;
  }

  private mmsiFromContext(ctx: string): string {
    // ctx: "vessels.urn:mrn:imo:mmsi:123456789"
    const m = ctx.match(/mmsi:(\d+)/);
    return m?.[1] ?? ctx.split('.').pop() ?? ctx;
  }

  private ownMmsi(): string {
    return this.mmsiFromContext(this.ownContext);
  }

  private currentOwnPosition(): LatLon | null {
    const ownMmsi = this.ownMmsi();
    if (!ownMmsi) return null;
    const v = this.vesselMap.value.get(ownMmsi);
    const last = v?.positions[v.positions.length - 1];
    return last ? { lat: last.lat, lon: last.lon } : null;
  }

  isStale(vessel: Vessel): boolean {
    return Date.now() - vessel.lastUpdated > STALE_THRESHOLD_MS;
  }

  /**
   * Pull current vessel identity from Signal-K REST.
   * The data browser shows the full store; the WebSocket often only streams
   * later changes, so AIS `name` set before connect never arrives otherwise.
   */
  private async hydrateFromRest(): Promise<void> {
    const base = this.sk.httpBaseUrl();
    if (!base) return;
    try {
      const res = await fetch(`${base}/signalk/v1/api/vessels`, { cache: 'no-store' });
      if (!res.ok) return;
      const body = await res.json() as Record<string, unknown>;
      const current = new Map(this.vesselMap.value);
      let changed = false;

      for (const [key, raw] of Object.entries(body)) {
        if (!raw || typeof raw !== 'object') continue;
        const tree = raw as Record<string, unknown>;
        const ctxKey = key.startsWith('vessels.') ? key : `vessels.${key}`;
        if (ctxKey === 'vessels.self') continue;

        const mmsi =
          (typeof skLeaf(tree, 'mmsi') === 'string' || typeof skLeaf(tree, 'mmsi') === 'number'
            ? String(skLeaf(tree, 'mmsi'))
            : undefined) ??
          this.mmsiFromContext(ctxKey);
        if (!mmsi || !/^\d{5,}$/.test(mmsi)) continue;

        const name = coerceVesselName(skLeaf(tree, 'name'));
        const lengthM = skNumber(tree, 'design.length.overall')
          ?? skNumber(tree, 'design.length');
        const beamM = skNumber(tree, 'design.beam.maximum')
          ?? skNumber(tree, 'design.beam');

        const partial = this.getOrCreatePartial(ctxKey);
        if (name) partial.name = name;
        partial.mmsi = mmsi;
        if (lengthM !== undefined) partial.lengthM = lengthM;
        if (beamM !== undefined) partial.beamM = beamM;

        // Only enrich vessels already seen on the delta stream (have a position).
        const vessel = current.get(mmsi);
        if (!vessel) continue;

        if (name && vessel.name !== name) {
          vessel.name = name;
          changed = true;
        }
        if (lengthM !== undefined && vessel.lengthMetres !== lengthM) {
          vessel.lengthMetres = lengthM;
          changed = true;
        }
        if (beamM !== undefined && vessel.beamMetres !== beamM) {
          vessel.beamMetres = beamM;
          changed = true;
        }
      }

      if (changed) {
        this.vesselMap.next(current);
        this.recalculateStates();
      }
    } catch (err) {
      console.warn('Anchorage SK REST hydrate failed', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helpers

function isWithinRadius(lat: number, lon: number, centre: LatLon | null, radiusM: number): boolean {
  if (!centre) return true;
  return haversineDistance(centre, { lat, lon }) <= radiusM;
}

function prunePositions(positions: VesselPosition[]): VesselPosition[] {
  const cutoff = Date.now() - POSITION_MAX_AGE_MS;
  return positions.filter(p => p.timestamp > cutoff);
}

function computeConfidence(posCount: number): 'low' | 'medium' | 'high' {
  if (posCount > 15) return 'high';
  if (posCount >= 5)  return 'medium';
  return 'low';
}

/** Strip self. / vessels.<ctx>. so "vessels.urn:…mmsi:123.name" becomes "name". */
function relativeSkPath(path: string, context: string): string {
  let p = path.startsWith('self.') ? path.slice(5) : path;
  if (p.startsWith('vessels.self.')) p = p.slice('vessels.self.'.length);
  const ctxPrefix = context.endsWith('.') ? context : `${context}.`;
  if (p.startsWith(ctxPrefix)) p = p.slice(ctxPrefix.length);
  return p;
}

/** SK `name` is usually a string; some plugins send { default: "…" }. */
function coerceVesselName(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    for (const key of ['default', 'en', 'name', 'value']) {
      if (typeof rec[key] === 'string' && (rec[key] as string).trim()) {
        return (rec[key] as string).trim();
      }
    }
  }
  return undefined;
}

/** Read a leaf from a Signal-K REST vessel tree (handles nested `.value`). */
function skLeaf(tree: Record<string, unknown>, dotted: string): unknown {
  const parts = dotted.split('.');
  let cur: unknown = tree;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur && typeof cur === 'object' && 'value' in (cur as object)) {
    return (cur as { value: unknown }).value;
  }
  return cur;
}

function skNumber(tree: Record<string, unknown>, dotted: string): number | undefined {
  const leaf = skLeaf(tree, dotted);
  if (typeof leaf === 'number' && Number.isFinite(leaf)) return leaf;
  if (leaf && typeof leaf === 'object') {
    const rec = leaf as Record<string, unknown>;
    for (const key of ['overall', 'maximum', 'value']) {
      const inner = rec[key];
      if (typeof inner === 'number' && Number.isFinite(inner)) return inner;
      if (inner && typeof inner === 'object' && typeof (inner as { value?: number }).value === 'number') {
        return (inner as { value: number }).value;
      }
    }
  }
  return undefined;
}
