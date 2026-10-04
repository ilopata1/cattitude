import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { formatCurrentSails } from '../../core/guide/current-sail';
import { logbookPrintHtml, logbookToCsv, logbookToGpx, triggerLabel } from '../../core/logbook/logbook-export';
import { enginesRunning } from '../../core/logbook/logbook-ingest';
import {
  derivePropulsion,
  destinationDistanceNm,
  formatLogClock,
  formatPosition,
  nextSlotMs,
  readingUsable,
  sailsUp,
  utcDayKey,
  utcDayLabel,
} from '../../core/logbook/logbook-math';
import {
  LOG_INTERVALS,
  LogEntry,
  LogIntervalHours,
  LogbookSettings,
  Passage,
  PropulsionState,
  LiveReading,
  emptyReading,
} from '../../core/models/logbook.model';
import { CurrentSailService } from '../../core/services/current-sail.service';
import { LogbookSamplerService } from '../../core/services/logbook-sampler.service';
import { LogbookSyncService } from '../../core/services/logbook-sync.service';
import { LogbookService } from '../../core/services/logbook.service';

interface WaypointDraft {
  id: string;
  name: string;
  lat: string;
  lon: string;
  passedAt: string | null;
}

interface PassageDraft {
  id: string;
  name: string;
  destinationName: string;
  lat: string;
  lon: string;
  radius: string;
  watch: string;
  waypoints: WaypointDraft[];
  departedAt: string | null;
  arrivedAt: string | null;
}

interface EntryDraft {
  remarks: string;
  seaState: string;
  cloudOktas: string;
  visibilityNm: string;
}

type EntryView = 'cards' | 'table';

type LogTableKey =
  | 'time'
  | 'why'
  | 'position'
  | 'hdg'
  | 'cog'
  | 'sog'
  | 'stw'
  | 'tws'
  | 'avg'
  | 'gust'
  | 'twd'
  | 'hpa'
  | 'trend'
  | 'depth'
  | 'status'
  | 'sails'
  | 'nm'
  | 'wp'
  | 'dtg'
  | 'sea'
  | 'cloud'
  | 'vis'
  | 'watch'
  | 'remarks'
  | 'gaps';

interface LogTableColumn {
  key: LogTableKey;
  label: string;
  unit: string;
  numeric: boolean;
  wrap?: boolean;
  cap?: boolean;
}

const LOGBOOK_VIEW_KEY = 'cattitude.logbook.entryView';

@Component({
  selector: 'app-logbook',
  templateUrl: './logbook.page.html',
  styleUrls: ['./logbook.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class LogbookPage implements OnInit, OnDestroy {
  private readonly logbook = inject(LogbookService);
  private readonly sampler = inject(LogbookSamplerService);
  private readonly sails = inject(CurrentSailService);
  private readonly alerts = inject(AlertController);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly sync = inject(LogbookSyncService);

  entries: LogEntry[] = [];
  passage: Passage | null = null;
  settings: LogbookSettings = this.logbook.settings$.value;
  reading: LiveReading = emptyReading();
  draft: PassageDraft = blankDraft();
  draftDirty = false;
  passageOpen = false;
  settingsOpen = false;
  showAll = false;
  entryView: EntryView = storedEntryView();
  openId: string | null = null;
  readonly tableColumns: LogTableColumn[] = [
    { key: 'time', label: 'Time', unit: 'UTC', numeric: false },
    { key: 'why', label: 'Why', unit: '', numeric: false },
    { key: 'position', label: 'Position', unit: '', numeric: false },
    { key: 'hdg', label: 'HDG', unit: '°', numeric: true },
    { key: 'cog', label: 'COG', unit: '°', numeric: true },
    { key: 'sog', label: 'SOG', unit: 'kn', numeric: true },
    { key: 'stw', label: 'STW', unit: 'kn', numeric: true },
    { key: 'tws', label: 'TWS', unit: 'kn', numeric: true },
    { key: 'avg', label: 'Avg', unit: 'kn', numeric: true },
    { key: 'gust', label: 'Gust', unit: 'kn', numeric: true },
    { key: 'twd', label: 'TWD', unit: '°', numeric: true },
    { key: 'hpa', label: 'hPa', unit: '', numeric: true },
    { key: 'trend', label: '3h', unit: 'hPa', numeric: true },
    { key: 'depth', label: 'Depth', unit: 'm', numeric: true },
    { key: 'status', label: 'Status', unit: '', numeric: false, cap: true },
    { key: 'sails', label: 'Sails', unit: '', numeric: false, wrap: true },
    { key: 'nm', label: 'Since', unit: 'nm', numeric: true },
    { key: 'wp', label: 'Waypoint', unit: 'nm', numeric: true },
    { key: 'dtg', label: 'To go', unit: 'nm', numeric: true },
    { key: 'sea', label: 'Sea', unit: '0–9', numeric: true },
    { key: 'cloud', label: 'Cloud', unit: 'oktas', numeric: true },
    { key: 'vis', label: 'Vis', unit: 'nm', numeric: true },
    { key: 'watch', label: 'Watch', unit: '', numeric: false },
    { key: 'remarks', label: 'Remarks', unit: '', numeric: false, wrap: true },
    { key: 'gaps', label: 'Missing', unit: '', numeric: false, wrap: true },
  ];
  entryDraft: EntryDraft = { remarks: '', seaState: '', cloudOktas: '', visibilityNm: '' };
  saving = false;
  readonly intervals = LOG_INTERVALS;
  readonly triggerLabel = triggerLabel;
  readonly formatLogClock = formatLogClock;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    void this.logbook.ensureReady();
    void this.sampler.start();
    this.subs.push(
      this.logbook.entries$.subscribe(entries => {
        this.entries = entries;
        this.cdr.markForCheck();
      }),
      this.logbook.passage$.subscribe(passage => {
        this.passage = passage;
        if (!this.draftDirty) this.draft = passage ? draftFrom(passage) : blankDraft();
        this.cdr.markForCheck();
      }),
      this.logbook.settings$.subscribe(settings => {
        this.settings = settings;
        this.cdr.markForCheck();
      }),
      this.sampler.reading$.subscribe(reading => {
        this.reading = reading;
        this.cdr.markForCheck();
      }),
      this.sails.changed$.subscribe(() => this.cdr.markForCheck()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  visible(): LogEntry[] {
    if (this.showAll || !this.passage) return this.entries;
    return this.entries.filter(entry => entry.passageId === this.passage?.id);
  }

  days(): Array<{ label: string; entries: LogEntry[] }> {
    const groups: Array<{ key: string; label: string; entries: LogEntry[] }> = [];
    for (const entry of this.visible()) {
      const key = utcDayKey(entry.at);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({ key, label: utcDayLabel(key), entries: [entry] });
      } else {
        last.entries.push(entry);
      }
    }
    return groups;
  }

  propulsion(): PropulsionState | null {
    if (!readingUsable(this.reading)) return null;
    const selection = this.sails.selection();
    return derivePropulsion({
      navState: this.reading.navState,
      enginesRunning: enginesRunning(this.reading),
      sailsUp: sailsUp(selection.main, selection.headsail),
      sogKn: this.reading.sogKn,
    });
  }

  positionText(): string {
    const position = this.reading.position;
    return position ? formatPosition(position.lat, position.lon) : 'No position';
  }

  entryPosition(entry: LogEntry): string {
    return entry.position ? formatPosition(entry.position.lat, entry.position.lon) : 'No position';
  }

  liveDtg(): string {
    const distance = destinationDistanceNm(this.reading.position, this.passage);
    return distance == null ? '' : `${distance.toFixed(1)} nm to go`;
  }

  nextLog(): string {
    const last = this.entries.find(entry => entry.trigger === 'interval');
    const slot = nextSlotMs(
      Date.now(),
      last ? Date.parse(last.at) : 0,
      this.settings.intervalHours,
      this.settings.offsetMinutes,
    );
    return formatLogClock(new Date(slot).toISOString());
  }

  sailNow(): string {
    return formatCurrentSails(this.sails.selection()) || 'Sails not set';
  }

  num(value: number | null, digits = 1): string {
    return value == null ? '—' : value.toFixed(digits);
  }

  trend(entry: LogEntry): string {
    const value = entry.pressureTrend3hHpa;
    if (value == null) return '';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
  }

  setEntryView(view: EntryView): void {
    this.entryView = view;
    try {
      localStorage.setItem(LOGBOOK_VIEW_KEY, view);
    } catch {
      /* preference is optional */
    }
  }

  tableCell(entry: LogEntry, key: LogTableKey): string {
    switch (key) {
      case 'time':
        return formatLogClock(entry.at);
      case 'why':
        return triggerLabel(entry.trigger);
      case 'position':
        return entry.position ? formatPosition(entry.position.lat, entry.position.lon) : '—';
      case 'hdg':
        return this.num(entry.headingTrueDeg, 0);
      case 'cog':
        return this.num(entry.cogDeg, 0);
      case 'sog':
        return this.num(entry.sogKn);
      case 'stw':
        return this.num(entry.stwKn);
      case 'tws':
        return this.num(entry.wind.twsKn);
      case 'avg':
        return this.num(entry.wind.meanTwsSinceLastKn);
      case 'gust':
        return this.num(entry.wind.gustSinceLastKn);
      case 'twd':
        return this.num(entry.wind.twdDeg, 0);
      case 'hpa':
        return this.num(entry.pressureHpa);
      case 'trend':
        return this.trend(entry) || '—';
      case 'depth':
        return this.num(entry.depthM);
      case 'status':
        return entry.propulsion.state;
      case 'sails':
        return sailCell(entry);
      case 'nm':
        return this.num(entry.distances.sinceLastEntryGroundNm);
      case 'wp':
        return this.num(entry.distances.sinceLastWaypointNm);
      case 'dtg':
        return this.num(entry.distances.toDestinationNm);
      case 'sea':
        return this.num(entry.seaState, 0);
      case 'cloud':
        return this.num(entry.cloudOktas, 0);
      case 'vis':
        return this.num(entry.visibilityNm);
      case 'watch':
        return entry.watch?.trim() || '—';
      case 'remarks':
        return entry.remarks.trim() || '—';
      case 'gaps':
        return entry.staleFields.length ? entry.staleFields.join(', ') : '—';
    }
  }

  async logNow(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Log now',
      inputs: [{ name: 'remarks', type: 'textarea', placeholder: 'Remarks (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save entry',
          handler: (data: { remarks?: string }) => {
            void this.logbook.record('manual', { remarks: data?.remarks ?? '', force: true });
          },
        },
      ],
    });
    await alert.present();
  }

  toggleEntry(entry: LogEntry): void {
    if (this.openId === entry.id) {
      this.openId = null;
      return;
    }
    this.openId = entry.id;
    this.entryDraft = {
      remarks: entry.remarks,
      seaState: entry.seaState == null ? '' : String(entry.seaState),
      cloudOktas: entry.cloudOktas == null ? '' : String(entry.cloudOktas),
      visibilityNm: entry.visibilityNm == null ? '' : String(entry.visibilityNm),
    };
  }

  async saveEntryEdits(entry: LogEntry): Promise<void> {
    await this.logbook.correct(entry.id, {
      remarks: this.entryDraft.remarks.trim(),
      seaState: optionalInt(this.entryDraft.seaState, 0, 9),
      cloudOktas: optionalInt(this.entryDraft.cloudOktas, 0, 8),
      visibilityNm: optionalNumber(this.entryDraft.visibilityNm),
    });
  }

  markDraftDirty(): void {
    this.draftDirty = true;
  }

  addWaypoint(): void {
    this.draft.waypoints.push({
      id: newId(),
      name: '',
      lat: '',
      lon: '',
      passedAt: null,
    });
    this.draftDirty = true;
  }

  removeWaypoint(id: string): void {
    this.draft.waypoints = this.draft.waypoints.filter(waypoint => waypoint.id !== id);
    this.draftDirty = true;
  }

  async savePassage(): Promise<void> {
    this.saving = true;
    try {
      await this.commitDraft();
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  async depart(): Promise<void> {
    if (!(await this.ensurePassageSaved())) return;
    await this.logbook.record('departure', { force: true });
  }

  async arrive(): Promise<void> {
    if (!(await this.ensurePassageSaved())) return;
    await this.logbook.record('arrival', { force: true });
  }

  async markWaypoint(id: string): Promise<void> {
    if (this.draftDirty) {
      await this.tell('Save the passage first', 'The waypoint list has edits that are not in the log yet.');
      return;
    }
    await this.logbook.record('waypoint', { waypointId: id, force: true });
  }

  async setInterval(hours: LogIntervalHours): Promise<void> {
    await this.logbook.saveSettings({ ...this.settings, intervalHours: hours });
  }

  async saveSettings(): Promise<void> {
    await this.logbook.saveSettings(this.settings);
  }

  exportCsv(): void {
    download('logbook.csv', 'text/csv', logbookToCsv(this.visible()));
  }

  exportGpx(): void {
    download('logbook.gpx', 'application/gpx+xml', logbookToGpx(this.visible(), this.passage));
  }

  printLog(): void {
    const popup = window.open('', '_blank', 'noopener');
    if (!popup) return;
    popup.document.write(logbookPrintHtml(this.visible(), this.passage));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  private async ensurePassageSaved(): Promise<boolean> {
    if (!this.draftDirty && this.passage) return true;
    return !!(await this.commitDraft());
  }

  private async commitDraft(): Promise<Passage | null> {
    const passage = this.passageFromDraft();
    if (!passage) return null;
    this.draft.id = passage.id;
    this.draftDirty = false;
    await this.logbook.savePassage(passage);
    return passage;
  }

  private passageFromDraft(): Passage | null {
    const lat = this.draft.lat.trim() ? Number(this.draft.lat) : null;
    const lon = this.draft.lon.trim() ? Number(this.draft.lon) : null;
    const radius = Number(this.draft.radius);
    if (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      void this.tell('Check the destination', 'Latitude needs to be between -90 and 90.');
      return null;
    }
    if (lon != null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) {
      void this.tell('Check the destination', 'Longitude needs to be between -180 and 180.');
      return null;
    }
    if (!Number.isFinite(radius) || radius <= 0 || radius > 50) {
      void this.tell('Check the arrival radius', 'Use a distance in nautical miles, up to 50.');
      return null;
    }
    const waypoints = [];
    for (const waypoint of this.draft.waypoints) {
      const wLat = Number(waypoint.lat);
      const wLon = Number(waypoint.lon);
      if (!Number.isFinite(wLat) || !Number.isFinite(wLon) || wLat < -90 || wLat > 90 || wLon < -180 || wLon > 180) {
        void this.tell('Check a waypoint', 'Each waypoint needs a latitude and longitude.');
        return null;
      }
      waypoints.push({
        id: waypoint.id,
        name: waypoint.name.trim() || 'Waypoint',
        lat: wLat,
        lon: wLon,
        passedAt: waypoint.passedAt,
      });
    }
    return {
      id: this.draft.id || newId(),
      name: this.draft.name.trim(),
      destinationName: this.draft.destinationName.trim(),
      destinationLat: lat,
      destinationLon: lon,
      arrivalRadiusNm: radius,
      waypoints,
      departedAt: this.draft.departedAt,
      arrivedAt: this.draft.arrivedAt,
      watch: this.draft.watch.trim(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async tell(header: string, message: string): Promise<void> {
    const alert = await this.alerts.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }
}

function storedEntryView(): EntryView {
  try {
    return localStorage.getItem(LOGBOOK_VIEW_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

function sailCell(entry: LogEntry): string {
  const label = entry.sails.label.trim();
  const plan = entry.sails.recommended?.trim() ?? '';
  if (!label && !plan) return '—';
  if (!plan) return label;
  if (!label) return plan;
  return `${label} · ${plan}`;
}

function blankDraft(): PassageDraft {
  return {
    id: '',
    name: '',
    destinationName: '',
    lat: '',
    lon: '',
    radius: '0.3',
    watch: '',
    waypoints: [],
    departedAt: null,
    arrivedAt: null,
  };
}

function draftFrom(passage: Passage): PassageDraft {
  return {
    id: passage.id,
    name: passage.name,
    destinationName: passage.destinationName,
    lat: passage.destinationLat == null ? '' : String(passage.destinationLat),
    lon: passage.destinationLon == null ? '' : String(passage.destinationLon),
    radius: String(passage.arrivalRadiusNm),
    watch: passage.watch,
    departedAt: passage.departedAt,
    arrivedAt: passage.arrivedAt,
    waypoints: passage.waypoints.map(waypoint => ({
      id: waypoint.id,
      name: waypoint.name,
      lat: String(waypoint.lat),
      lon: String(waypoint.lon),
      passedAt: waypoint.passedAt,
    })),
  };
}

function optionalInt(raw: string, min: number, max: number): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function optionalNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}`;
}

function download(filename: string, mime: string, body: string): void {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
