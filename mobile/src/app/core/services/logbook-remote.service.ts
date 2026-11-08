import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { entriesFromLogentriesBody, isPassage, recorderIsFresh } from '../logbook/logbook-remote';
import {
  LogEntry,
  LogTrigger,
  LogbookSettings,
  Passage,
} from '../models/logbook.model';
import { SignalKSettingsService } from './signal-k-settings.service';
import { SignalKService } from './signal-k.service';

export interface RecorderContext {
  settings?: LogbookSettings;
  passage?: Passage | null;
  sails?: { main: string; headsail: string; recommended?: string | null };
  recommended?: string | null;
}

interface RecorderStatus {
  recording?: boolean;
  recordingAt?: string;
  settings?: LogbookSettings;
  passage?: Passage | null;
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
      this.status = status;
      this.recording.set(status.recording === true && recorderIsFresh(status.recordingAt, Date.now()));
      this.error.set(null);
    } catch {
      this.recording.set(false);
      this.status = null;
    }
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

  async publish(context: RecorderContext): Promise<void> {
    const base = this.sk.httpBaseUrl();
    if (!base) return;
    try {
      const status = await firstValueFrom(this.http.put<RecorderStatus>(
        `${base}/plugins/cattitude-logbook/context`,
        context,
        { headers: this.headers() },
      ));
      this.status = status;
      this.recording.set(status.recording === true && recorderIsFresh(status.recordingAt, Date.now()));
      this.error.set(null);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) return;
      this.note(err, 'The boat recorder did not take the latest passage.');
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
