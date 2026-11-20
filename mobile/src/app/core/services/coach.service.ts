/**
 * Builds the coach snapshot from the live services and keeps the briefing
 * the captain is reading. Background rebuilds can notify. The words on
 * screen change only after ten minutes, when the page is opened or Refresh
 * is pressed. The long form may then replace those words with a checked rewrite.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subscription, firstValueFrom, interval } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AbReport, buildReport } from '../ab-test/ab-test';
import { assembleCoach } from '../coach/coach-assemble';
import { coachBriefing } from '../coach/coach-briefing';
import {
  COACH_OPEN_NOTE,
  briefMayRefresh,
  coachPreview,
  decideCoachPush,
  handoverBrief,
  handoverDue,
  minutesUntilNight,
  nextWatchChange,
  rebuildMayRun,
} from '../coach/coach-display';
import { CoachInputHealth, formatCoachInputLine } from '../coach/coach-inputs';
import {
  CoachAbRecord,
  CoachSummary,
  RememberedPassage,
  coachAbRecord,
  keepSummaries,
  rememberPassage,
  sinceWatchLine,
  summaryDue,
  summaryFromSnapshot,
  summaryHasFacts,
  watchStartedAt,
} from '../coach/coach-memory';
import { CoachFinding, CoachSnapshot } from '../coach/coach.model';
import { CoachStreamSample } from '../coach/coach-snapshot';
import {
  COACH_BRIEF_HOLD_MS,
  COACH_REWRITE_TIMEOUT_MS,
} from '../coach/coach-settings';
import { coachSamplesFromDelta, rememberCoachSample } from '../coach/coach-stream';
import { PolarSample, PolarWindowMinutes } from '../models/polar.model';
import { hullTypeForVessel, resolveWaveConfig } from '../waves/wave-settings';
import { AbTestService } from './ab-test.service';
import { CoachStoreService, StoredCoachTest } from './coach-store.service';
import { ContentService } from './content.service';
import { CurrentSailService } from './current-sail.service';
import { DutyRotaService } from './duty-rota.service';
import { LogbookSamplerService } from './logbook-sampler.service';
import { LogbookService } from './logbook.service';
import { NotificationBridgeService } from './notification-bridge.service';
import { PolarService } from './polar.service';
import { SailPlanService } from './sail-plan.service';
import { SignalKDelta, SignalKService } from './signal-k.service';
import { VesselContextService } from './vessel-context.service';
import { WaveEstimatorService } from './wave-estimator.service';
import { WaveSettingsService } from './wave-settings.service';
import { CoachInputsService } from './coach-inputs.service';

export interface CoachView {
  connected: boolean;
  header: string;
  body: string;
  expanded: boolean;
  longForm: boolean;
  source: 'software' | 'AI-written';
  healthLines: string[];
  note: string;
  handover: boolean;
  holdNote: string | null;
  sinceWatch: string | null;
}

interface HeldText {
  generatedAt: number;
  short: string;
  long: string;
  llm: string | null;
}

interface RewriteReply {
  text?: string;
  source?: string;
}

const EMPTY_VIEW: CoachView = {
  connected: false,
  header: '',
  body: '',
  expanded: false,
  longForm: false,
  source: 'software',
  healthLines: [],
  note: COACH_OPEN_NOTE,
  handover: false,
  holdNote: null,
  sinceWatch: null,
};

@Injectable({ providedIn: 'root' })
export class CoachService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sk = inject(SignalKService);
  private readonly inputs = inject(CoachInputsService);
  private readonly polar = inject(PolarService);
  private readonly waves = inject(WaveEstimatorService);
  private readonly waveSettings = inject(WaveSettingsService);
  private readonly sailPlans = inject(SailPlanService);
  private readonly sails = inject(CurrentSailService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly logbook = inject(LogbookService);
  private readonly duty = inject(DutyRotaService);
  private readonly content = inject(ContentService);
  private readonly vessel = inject(VesselContextService);
  private readonly notifications = inject(NotificationBridgeService);
  private readonly memory = inject(CoachStoreService);
  private readonly abTests = inject(AbTestService);

  private readonly viewSubject = new BehaviorSubject<CoachView>(EMPTY_VIEW);
  readonly view$ = this.viewSubject.asObservable();

  private readonly subs = new Subscription();
  private samples: CoachStreamSample[] = [];
  private polarSamples: PolarSample[] = [];
  private liveTargetKn: number | null = null;
  private health: CoachInputHealth[] = [];
  private connected = false;
  private sailsChangedAt: number | null = null;
  private waveAt: number | null = null;
  private lastRebuildAt: number | null = null;
  private latest: { snapshot: CoachSnapshot; findings: CoachFinding[] } | null = null;
  private held: HeldText | null = null;
  private expanded = false;
  private longForm = false;
  private rewriteToken = 0;
  private rewritePending = false;
  private readonly openPush = new Set<string>();
  private abRecords: CoachAbRecord[] = [];
  private summaries: CoachSummary[] = [];
  private passages: RememberedPassage[] = [];
  private lastSummaryAt: number | null = null;
  private savedAbId = '';

  constructor() {
    this.polar.start();
    void this.sampler.start();
    void this.sailPlans.ensureLoaded();
    this.subs.add(this.sk.state$.subscribe(state => {
      this.connected = state === 'connected';
      this.publish();
    }));
    this.subs.add(this.sk.delta$.subscribe(delta => this.onDelta(delta)));
    this.subs.add(this.inputs.health$.subscribe(health => {
      this.health = health;
      this.publish();
    }));
    this.subs.add(this.polar.samples$.subscribe(samples => {
      this.polarSamples = samples;
    }));
    this.subs.add(this.polar.live$.subscribe(live => {
      this.liveTargetKn = live.targetKnots;
    }));
    this.subs.add(this.polar.windows$.subscribe(() => this.scheduleRebuild()));
    this.subs.add(this.sailPlans.plan$.subscribe(() => this.scheduleRebuild()));
    this.subs.add(this.sails.changed$.subscribe(() => {
      this.sailsChangedAt = Date.now();
      this.scheduleRebuild();
    }));
    this.subs.add(this.logbook.entries$.subscribe(() => this.scheduleRebuild()));
    this.subs.add(this.waves.state$.subscribe(state => {
      const time = state.estimate?.time ?? null;
      if (time == null || time === this.waveAt) return;
      this.waveAt = time;
      this.scheduleRebuild();
    }));
    this.subs.add(interval(COACH_BRIEF_HOLD_MS).subscribe(() => this.scheduleRebuild()));
    this.subs.add(this.abTests.session$.subscribe(session => {
      if (session.phase !== 'results') return;
      const finishedAt = Date.now();
      const record = coachAbRecord(session, finishedAt);
      const report = buildReport(session);
      if (!record || !report || record.id === this.savedAbId) return;
      this.savedAbId = record.id;
      void this.rememberTest(record, report);
    }));
    void this.memory.load().then(stored => {
      this.abRecords = stored.tests;
      this.summaries = stored.summaries;
      this.passages = stored.passages;
      this.lastSummaryAt = stored.summaries.length
        ? stored.summaries[stored.summaries.length - 1].at
        : null;
      this.scheduleRebuild();
    }).catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /** Opening Ask Skip, or coming back to the Polar page. */
  notePageEnter(nowMs = Date.now()): void {
    if (!this.connected || !briefMayRefresh(this.held, nowMs)) {
      this.publish();
      return;
    }
    this.generate(nowMs);
  }

  refresh(nowMs = Date.now()): void {
    this.notePageEnter(nowMs);
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.publish();
  }

  setLongForm(longForm: boolean): void {
    this.longForm = longForm;
    this.publish();
    if (longForm && this.held && !this.held.llm && this.latest && this.connected) {
      void this.rewrite(this.rewriteToken, this.latest, this.held.long);
    }
  }

  private onDelta(delta: SignalKDelta): void {
    const context = delta.context ?? '';
    if (context.startsWith('vessels.') && this.sk.self && context !== this.sk.self) return;
    const now = Date.now();
    for (const sample of coachSamplesFromDelta(delta, now)) {
      this.samples = rememberCoachSample(this.samples, sample, now);
    }
  }

  private scheduleRebuild(nowMs = Date.now()): void {
    if (!rebuildMayRun(this.lastRebuildAt, nowMs)) return;
    this.lastRebuildAt = nowMs;
    this.rebuild(nowMs);
  }

  private rebuild(nowMs: number): void {
    const reading = this.sampler.snapshot;
    const passage = this.logbook.passage$.value;
    const destination = passage && passage.destinationLat != null && passage.destinationLon != null
      ? { lat: passage.destinationLat, lon: passage.destinationLon }
      : null;
    const position = reading.position;
    const current = reading.setDeg != null && reading.driftKn != null
      ? { setDeg: reading.setDeg, driftKn: reading.driftKn }
      : null;
    const covered = {
      15: this.polar.windowCovered(15, nowMs),
      30: this.polar.windowCovered(30, nowMs),
      60: this.polar.windowCovered(60, nowMs),
    } as Record<PolarWindowMinutes, boolean>;
    const window = covered[30] ? this.polar.windows[30] : covered[15] ? this.polar.windows[15] : null;
    const targetKn = window && window.twaDeg != null && window.twsKnots != null
      ? this.polar.targetKnots(window.twaDeg, window.twsKnots)
      : this.liveTargetKn;
    const waveConfig = resolveWaveConfig(this.waveSettings.current, this.vesselType());
    const result = assembleCoach({
      nowMs,
      samples: this.samples,
      health: this.health,
      windows: this.polar.windows,
      covered,
      polarSamples: this.polarSamples.map(sample => ({
        at: sample.timestamp,
        stwKn: sample.stwKnots,
        targetKn: sample.targetKnots,
      })),
      targetKn,
      polarTargetKn: (twaDeg, twsKn) => this.polar.targetKnots(twaDeg, twsKn),
      wave: this.waves.current.estimate,
      sailsUp: this.sails.configuration(),
      sailsChangedAt: this.sailsChangedAt,
      selection: this.sails.selection(),
      plan: this.sailPlans.plan,
      position,
      destination,
      current,
      pressureHpa: reading.pressureHpa,
      track: this.sampler.samplesSince(nowMs - 3 * 60 * 60_000),
      vessel: {
        slug: this.vessel.vesselSlug,
        hullType: waveConfig.hullType || hullTypeForVessel(this.vesselType()),
        hasDaggerboards: null,
        lWlM: waveConfig.lWl,
        polarFile: this.polar.polarFilename$.value,
      },
      watch: nextWatchChange(this.duty.rota(), nowMs),
      minutesToNight: minutesUntilNight(position, nowMs),
      abTests: this.abRecords,
    });
    this.latest = result;
    this.noteSummary(result.snapshot, nowMs);
    if (this.connected) this.notify(result.findings);
    this.publish();
  }

  private generate(nowMs: number): void {
    this.lastRebuildAt = nowMs;
    this.rebuild(nowMs);
    if (!this.latest) return;
    const brief = coachBriefing(this.latest.snapshot, this.latest.findings);
    this.held = { generatedAt: nowMs, short: brief.short, long: brief.long, llm: null };
    this.rewriteToken += 1;
    const token = this.rewriteToken;
    this.publish();
    if (this.longForm) void this.rewrite(token, this.latest, brief.long);
  }

  private async rewrite(
    token: number,
    latest: { snapshot: CoachSnapshot; findings: CoachFinding[] },
    deterministic: string,
  ): Promise<void> {
    if (this.rewritePending) return;
    const slug = this.vessel.vesselSlug;
    if (!slug) return;
    this.rewritePending = true;
    try {
      const reply = await firstValueFrom(
        this.http.post<RewriteReply>(
          `${environment.apiUrl}/api/v1/vessels/${encodeURIComponent(slug)}/coach/brief`,
          {
            snapshot: latest.snapshot,
            findings: latest.findings,
            deterministic,
            style: 'long',
          },
        ).pipe(timeout(COACH_REWRITE_TIMEOUT_MS)),
      );
      if (token !== this.rewriteToken || !this.held) return;
      if (reply?.source === 'llm' && typeof reply.text === 'string' && reply.text.trim()) {
        this.held = { ...this.held, llm: reply.text };
        this.publish();
      }
    } catch {
      /* The software text is already on screen. */
    } finally {
      this.rewritePending = false;
    }
  }

  private notify(findings: CoachFinding[]): void {
    const decision = decideCoachPush(findings, this.openPush);
    this.openPush.clear();
    decision.open.forEach(id => this.openPush.add(id));
    for (const item of decision.notify) {
      this.notifications.notifyAppEvent(`coach.less-sail.${item.id}`, 'Coach', item.text);
    }
  }

  private publish(): void {
    this.viewSubject.next(this.compose());
  }

  private compose(): CoachView {
    const healthLines = this.health
      .filter(row => row.status !== 'ok')
      .map(formatCoachInputLine);
    const view: CoachView = {
      connected: this.connected,
      header: '',
      body: '',
      expanded: this.expanded,
      longForm: this.longForm,
      source: 'software',
      healthLines,
      note: COACH_OPEN_NOTE,
      handover: false,
      holdNote: null,
      sinceWatch: null,
    };
    if (!this.connected || !this.held || !this.latest) return view;
    const full = this.longForm ? (this.held.llm ?? this.held.long) : this.held.short;
    const handover = handoverDue(this.latest.snapshot.outlook.minutesToWatchChange);
    const shown = handover && !this.longForm ? handoverBrief(full) : full;
    const preview = coachPreview(shown);
    const left = this.held.generatedAt + COACH_BRIEF_HOLD_MS - Date.now();
    return {
      ...view,
      header: preview.header,
      body: this.expanded ? restAfterHeader(shown) : preview.bottom,
      source: this.longForm && this.held.llm ? 'AI-written' : 'software',
      handover,
      holdNote: left > 0 ? `Same briefing for ${Math.ceil(left / 60_000)} min.` : null,
      sinceWatch: handover
        ? sinceWatchLine(this.summaries, watchStartedAt(this.duty.rota(), this.latest.snapshot.builtAt), this.latest.snapshot.builtAt)
        : null,
    };
  }

  private noteSummary(snapshot: CoachSnapshot, nowMs: number): void {
    const passage = this.logbook.passage$.value;
    this.passages = rememberPassage(
      this.passages,
      passage ? { id: passage.id, arrivedAt: passage.arrivedAt } : null,
      nowMs,
    );
    if (!this.connected || !summaryDue(this.lastSummaryAt, nowMs)) {
      this.summaries = keepSummaries(this.summaries, this.passages, nowMs);
      return;
    }
    const row = summaryFromSnapshot(snapshot, passage?.id ?? null);
    if (!summaryHasFacts(row)) return;
    this.lastSummaryAt = row.at;
    this.summaries = keepSummaries([...this.summaries, row], this.passages, nowMs);
    void this.memory.saveMemory(row, this.passages, nowMs).then(stored => {
      this.abRecords = stored.tests;
      this.summaries = stored.summaries;
      this.passages = stored.passages;
      this.publish();
    }).catch(() => undefined);
  }

  private rememberTest(record: CoachAbRecord, report: AbReport): Promise<void> {
    const stored: StoredCoachTest = { ...record, report };
    this.abRecords = [record, ...this.abRecords.filter(item => item.id !== record.id)];
    this.scheduleRebuild();
    return this.memory.saveTest(stored);
  }

  private vesselType(): string | null {
    try {
      return this.content.bootstrap.branding.vesselType;
    } catch {
      return null;
    }
  }
}

function restAfterHeader(text: string): string {
  const blocks = text.split('\n\n');
  return blocks.slice(1).join('\n\n').trim();
}
