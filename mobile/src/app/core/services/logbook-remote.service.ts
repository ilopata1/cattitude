import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DutyRota } from '../duty/duty-rota';
import {
  BoatPart,
  BoatRevs,
  entriesFromLogentriesBody,
  isPassage,
  parseBoatRevs,
  recorderStatusFresh,
} from '../logbook/logbook-remote';
import {
  LogEntry,
  LogTrigger,
  LogbookSettings,
  Passage,
} from '../models/logbook.model';
import { TrackSample } from '../models/logbook.model';
import { PolarHistoryResponse } from '../models/polar.model';
import { SignalKSettingsService } from './signal-k-settings.service';
import { SignalKService } from './signal-k.service';

export interface RecorderContext {
  /** The boat revision each sent part was based on. A stale part is refused with 409. */
  baseRevs?: Partial<Record<BoatPart, number>>;
  settings?: LogbookSettings;
  passage?: Passage | null;
  rota?: DutyRota;
  alerts?: { houseBatteryPercent: number };
  /** Phone wall clock minus `Date.now()`, so the boat can follow the duty rota. */
  wallOffsetMs?: number;
  sails?: { main: string; headsail: string; recommended?: string | null };
  recommended?: string | null;
}

export interface RecorderStatus {
  recording?: boolean;
  recordingAt?: string;
  /** Boat clock. */
  now?: string;
  settings?: LogbookSettings;
  passage?: Passage | null;
  rota?: DutyRota | null;
  alerts?: { houseBatteryPercent?: number } | null;
  sails?: { main?: string; headsail?: string; label?: string; recommended?: string | null } | null;
  revs?: unknown;
  conflicts?: BoatPart[];
}

export interface PublishResult {
  /** Parts the boat refused because another device changed them first. */
  conflicts: BoatPart[];
}

/**
 * The boat recorder (signalk-cattitude-logbook) and the signalk-logbook
 * store. Phones read and annotate. Automatic rows are written on the boat.
 */
@Injectable({ providedIn: 'root' })
export class LogbookRemoteService {
  private readonly http = inject(HttpClient);
  private readonly sk = inject(SignalKService);
  private readonly settings = inject(SignalKSettingsService);

  readonly recording = signal(false);
  readonly error = signal<string | null>(null);
  private status: RecorderStatus | null = null;
  /** This device's clock minus the boat's, from the last track fetch. */
  trackOffsetMs = 0;

  async refresh(): Promise<void> {
    const base = this.sk.httpBaseUrl();
    if (!base) {
      this.recording.set(false);
      this.status = null;
      return;
    }
    try {
      const status = await firstValueFrom(this.http.get<RecorderStatus>(
        `${base}/plugins/cattitude-logbook/status`,
        { headers: this.headers() },
      ));
      this.take(status);
      this.error.set(null);
    } catch {
      this.recording.set(false);
      this.status = null;
    }
  }

  /** Revisions from the last status. Null when the plugin predates them or is unreachable. */
  revs(): BoatRevs | null {
    return parseBoatRevs(this.status?.revs);
  }

  boatRota(): DutyRota | null {
    const rota = this.status?.rota;
    return rota && typeof rota === 'object' ? rota : null;
  }

  boatAlerts(): { houseBatteryPercent: number } | null {
    const percent = Number(this.status?.alerts?.houseBatteryPercent);
    return Number.isFinite(percent) ? { houseBatteryPercent: percent } : null;
  }

  /**
   * Track samples the boat recorded after `since` (boat clock, ms), at most one per
   * `stepMs`. Times come back on this device's clock. Null when the plugin has no track.
   */
  async track(since: number, stepMs = 0): Promise<TrackSample[] | null> {
    const base = this.sk.httpBaseUrl();
    if (!base) return null;
    try {
      const query = `since=${encodeURIComponent(String(since))}${stepMs ? `&step=${stepMs}` : ''}`;
      const body = await firstValueFrom(this.http.get<{ now?: number; samples?: TrackSample[] }>(
        `${base}/plugins/cattitude-logbook/track?${query}`,
        { headers: this.headers() },
      ));
      if (!body || !Array.isArray(body.samples) || !Number.isFinite(body.now)) return null;
      const offset = Date.now() - (body.now as number);
      this.trackOffsetMs = offset;
      return body.samples
        .filter(sample => sample && Number.isFinite(sample.at))
        .map(sample => ({ ...sample, at: sample.at + offset }));
    } catch {
      return null;
    }
  }

  boatSails(): { main: string; headsail: string } | null {
    const sails = this.status?.sails;
    if (!sails || typeof sails !== 'object') return null;
    return { main: String(sails.main ?? ''), headsail: String(sails.headsail ?? '') };
  }

  private take(status: RecorderStatus): void {
    this.status = status;
    this.recording.set(status.recording === true && recorderStatusFresh(status, Date.now()));
  }

  passage(): Passage | null {
    return isPassage(this.status?.passage) ? this.status.passage : null;
  }

  serverSettings(): LogbookSettings | null {
    const settings = this.status?.settings;
    if (!settings || (settings.intervalHours !== 1 && settings.intervalHours !== 3
      && settings.intervalHours !== 6 && settings.intervalHours !== 12
      && settings.intervalHours !== 24)) {
      return null;
    }
    return settings;
  }

  /** Null when the boat could not be reached and nothing was applied. */
  async publish(context: RecorderContext): Promise<PublishResult | null> {
    const base = this.sk.httpBaseUrl();
    if (!base) return null;
    try {
      const status = await firstValueFrom(this.http.put<RecorderStatus>(
        `${base}/plugins/cattitude-logbook/context`,
        context,
        { headers: this.headers() },
      ));
      this.take(status);
      this.error.set(null);
      return { conflicts: [] };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409 && err.error && typeof err.error === 'object') {
        const status = err.error as RecorderStatus;
        this.take(status);
        this.error.set('Another device changed this first. Showing the boat\'s copy.');
        return { conflicts: Array.isArray(status.conflicts) ? status.conflicts : [] };
      }
      if (err instanceof HttpErrorResponse && err.status === 404) return null;
      this.note(err, 'The boat recorder did not take the latest passage.');
      return null;
    }
  }

  /** Ask the boat recorder to write a row. Null when it deliberately skips. */
  async record(
    trigger: LogTrigger,
    options: { remarks?: string; waypointId?: string; force?: boolean },
  ): Promise<LogEntry | null | undefined> {
    const base = this.sk.httpBaseUrl();
    if (!base) return undefined;
    try {
      const response = await firstValueFrom(this.http.post<LogEntry>(
        `${base}/plugins/cattitude-logbook/record`,
        { trigger, ...options },
        { headers: this.headers(), observe: 'response' },
      ));
      this.error.set(null);
      if (response.status === 204) return null;
      return response.body;
    } catch (err) {
      this.note(err, 'The boat recorder did not write this entry.');
      return undefined;
    }
  }

  async correct(
    id: string,
    patch: Partial<Pick<LogEntry, 'remarks' | 'seaState' | 'cloudOktas' | 'visibilityNm' | 'watch'>>,
  ): Promise<LogEntry | null> {
    const base = this.sk.httpBaseUrl();
    if (!base) return null;
    try {
      const entry = await firstValueFrom(this.http.put<LogEntry>(
        `${base}/plugins/cattitude-logbook/entries/${encodeURIComponent(id)}`,
        patch,
        { headers: this.headers() },
      ));
      this.error.set(null);
      return entry;
    } catch (err) {
      this.note(err, 'The boat recorder did not save that correction.');
      return null;
    }
  }

  /**
   * Polar samples recorded on the boat since `since` (boat clock, milliseconds).
   * Null when the plugin is missing or the request fails. Does not raise a logbook error.
   */
  async polarHistory(since: number): Promise<PolarHistoryResponse | null> {
    const base = this.sk.httpBaseUrl();
    if (!base) return null;
    try {
      const body = await firstValueFrom(this.http.get<PolarHistoryResponse>(
        `${base}/plugins/cattitude-logbook/polar?since=${encodeURIComponent(String(since))}`,
        { headers: this.headers() },
      ));
      if (!body || !Array.isArray(body.samples) || !Number.isFinite(body.now)) return null;
      return body;
    } catch {
      return null;
    }
  }

  async pullEntries(): Promise<LogEntry[] | null> {
    const base = this.sk.httpBaseUrl();
    if (!base) return null;
    const from = new Date(Date.now() - 120 * 86_400_000).toISOString();
    try {
      const body = await firstValueFrom(this.http.get<unknown>(
        `${base}/signalk/v2/api/resources/logentries?from=${encodeURIComponent(from)}&limit=500`,
        { headers: this.headers() },
      ));
      this.error.set(null);
      return entriesFromLogentriesBody(body);
    } catch (err) {
      this.note(err, 'The boat logbook could not be read. Showing the copy on this device.');
      return null;
    }
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders({ Accept: 'application/json' });
    const token = this.settings.token.trim();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  private note(err: unknown, message: string): void {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      this.error.set('Signal K refused the logbook. Add a read/write token in Settings.');
      return;
    }
    this.error.set(message);
  }
}
