import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Subscription, combineLatest } from 'rxjs';
import {
  AB_SETTLE_MS,
  AbReport,
  AbSession,
  AbSetup,
  activeSetting,
  boatStateLine,
  buildReport,
  canStart,
  elapsedMs,
  emptySession,
  emptySetup,
  formatClock,
  isSettling,
  liveVmg,
  markCourseFromDestination,
  preparePrompt,
  remainingMs,
  blockProgress,
  scoredSamples,
  variableLabel,
} from '../../core/ab-test/ab-test';
import { MAIN_REEF_OPTIONS } from '../../core/guide/current-sail';
import { STALE_AFTER_MS } from '../../core/logbook/logbook-math';
import { LiveReading, Passage } from '../../core/models/logbook.model';
import { AbTestService } from '../../core/services/ab-test.service';
import { CurrentSailService } from '../../core/services/current-sail.service';
import { LogbookSamplerService } from '../../core/services/logbook-sampler.service';
import { LogbookService } from '../../core/services/logbook.service';
import { SignalKService } from '../../core/services/signal-k.service';

@Component({
  selector: 'app-ab-test',
  templateUrl: './ab-test.page.html',
  styleUrls: ['./ab-test.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'helm-screen' },
  standalone: false,
})
export class AbTestPage implements OnInit, OnDestroy {

  readonly mainReefOptions = MAIN_REEF_OPTIONS;
  readonly boards = ['Up', 'Half', 'Down'];

  setup: AbSetup = emptySetup();
  session: AbSession = emptySession();
  report: AbReport | null = null;
  connected = false;
  clock = '6:30';
  progress = 0;
  settling = false;
  settleClock = '1:30';
  scored = 0;
  livePct: string | null = null;
  liveKnots: string | null = null;
  liveDirection = '';
  destinationLabel = '';

  private readonly tests = inject(AbTestService);
  private readonly sails = inject(CurrentSailService);
  private readonly logbook = inject(LogbookService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly sk = inject(SignalKService);
  private readonly alerts = inject(AlertController);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subs: Subscription[] = [];
  private courseTouched = false;
  private courseSeen = '';
  private liveCourse = '';

  ngOnInit(): void {
    this.session = this.tests.session;
    this.setup = { ...this.tests.session.setup };
    this.courseSeen = this.setup.courseDeg.trim();
    if (this.courseSeen) this.courseTouched = true;
    if (this.session.phase === 'setup') this.prefill();
    this.refresh(this.session);
    void this.logbook.ensureReady();
    void this.sampler.start();
    this.subs.push(
      this.tests.session$.subscribe((session) => {
        this.session = session;
        this.refresh(session);
        this.cdr.markForCheck();
      }),
      this.sk.connected$.subscribe((connected) => {
        this.connected = connected;
        this.cdr.markForCheck();
      }),
      combineLatest([this.logbook.passage$, this.sampler.reading$]).subscribe(([passage, reading]) => {
        this.offerDestinationCourse(passage, reading);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  get canStartSetup(): boolean {
    return canStart(this.setup);
  }

  get sameSettings(): boolean {
    const a = this.setup.settingA.trim();
    const b = this.setup.settingB.trim();
    return Boolean(a && b && a === b);
  }

  get variableName(): string {
    return variableLabel(this.session.phase === 'setup' ? this.setup : this.session.setup);
  }

  get settingValue(): string {
    return activeSetting(this.session);
  }

  get promptTitle(): string {
    return preparePrompt(this.session).title;
  }

  get promptBody(): string {
    return preparePrompt(this.session).body;
  }

  get promptAction(): string {
    return preparePrompt(this.session).action;
  }

  get partLabel(): string {
    const cycle = this.session.cycle === 2 ? 'Second cycle · ' : '';
    return `${cycle}Part ${this.session.leg}`;
  }

  get boatLine(): string {
    return boatStateLine(this.session.phase === 'setup' ? this.setup : this.session.setup);
  }

  get courseHelp(): string {
    const course = this.setup.courseDeg.trim();
    if (!course) return 'Leave the course blank to score VMC along the wind.';
    if (this.destinationLabel && course === this.liveCourse) {
      return `Bearing to ${this.destinationLabel}. Clear it to score VMC along the wind.`;
    }
    return 'VMC uses this course. Clear it to score along the wind.';
  }

  touch(): void {
    this.tests.remember(this.setup);
  }

  onCourseEdit(value: string): void {
    const next = String(value ?? '').trim();
    if (next === this.courseSeen) {
      this.touch();
      return;
    }
    const previous = this.courseSeen;
    this.courseSeen = next;
    if (!(previous === '' && next === '') && next !== this.liveCourse) this.courseTouched = true;
    this.touch();
  }

  setMain(value: string | null | undefined): void {
    if (typeof value !== 'string') return;
    this.setup.main = value;
    this.touch();
  }

  setBoard(side: 'boardPort' | 'boardStarboard', value: string | null | undefined): void {
    if (typeof value !== 'string') return;
    this.setup[side] = value;
    this.touch();
  }

  start(): void {
    if (!canStart(this.setup)) return;
    this.tests.start(this.setup);
  }

  confirmReady(): void {
    this.tests.confirmReady();
  }

  rerun(): void {
    this.tests.rerun();
  }

  showResults(): void {
    this.tests.showResults();
  }

  newTest(): void {
    this.tests.abandon();
    this.setup = { ...this.tests.session.setup };
  }

  async cancel(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Cancel this test?',
      message: 'This discards the parts recorded so far. Your A and B settings stay filled in.',
      buttons: [
        { text: 'Keep going', role: 'cancel' },
        {
          text: 'Cancel test',
          role: 'destructive',
          handler: () => {
            this.tests.abandon();
            this.cdr.detectChanges();
          },
        },
      ],
    });
    await alert.present();
  }

  trackRow(index: number): number {
    return index;
  }

  private prefill(): void {
    const sails = this.sails.selection();
    if (!this.setup.main && sails.main) this.setup.main = sails.main;
    if (!this.setup.headsail && sails.headsail) this.setup.headsail = sails.headsail;
    this.touch();
  }

  private offerDestinationCourse(passage: Passage | null, reading: LiveReading): void {
    const destination = destinationOf(passage);
    const position = freshPosition(reading);
    this.destinationLabel = passage?.destinationName.trim() || passage?.name.trim() || (destination ? 'the destination' : '');
    this.liveCourse = markCourseFromDestination('', false, position, destination) ?? '';
    if (this.session.phase !== 'setup') {
      this.cdr.markForCheck();
      return;
    }
    const next = markCourseFromDestination(this.setup.courseDeg, this.courseTouched, position, destination);
    if (next != null) {
      this.courseSeen = next;
      this.liveCourse = next;
      this.setup.courseDeg = next;
      this.touch();
    }
    this.cdr.markForCheck();
  }

  private refresh(session: AbSession): void {
    const now = Date.now();
    this.report = session.phase === 'results' ? buildReport(session) : null;
    this.clock = formatClock(remainingMs(session, now));
    this.progress = blockProgress(session, now);
    this.settling = isSettling(session, now);
    this.settleClock = formatClock(Math.max(0, AB_SETTLE_MS - elapsedMs(session, now)));
    this.scored = scoredSamples(session);
    const live = liveVmg(session.liveSamples[session.liveSamples.length - 1] ?? null);
    this.livePct = live?.pct == null ? null : `${live.pct.toFixed(0)}%`;
    this.liveKnots = live?.knots == null ? null : `${live.knots.toFixed(1)} kn`;
    this.liveDirection = live == null ? '' : live.mode === 'downwind' ? 'downwind' : 'to windward';
  }
}

function destinationOf(passage: Passage | null): { lat: number; lon: number } | null {
  if (!passage || passage.destinationLat == null || passage.destinationLon == null) return null;
  return { lat: passage.destinationLat, lon: passage.destinationLon };
}

function freshPosition(reading: LiveReading): { lat: number; lon: number } | null {
  if (!reading.position || !reading.positionAt) return null;
  const at = Date.parse(reading.positionAt);
  if (!Number.isFinite(at) || Date.now() - at > STALE_AFTER_MS) return null;
  return reading.position;
}
