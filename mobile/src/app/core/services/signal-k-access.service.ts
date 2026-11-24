import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AccessState,
  accessRequestBody,
  defaultDeviceName,
  newClientId,
  parseAccessReply,
} from '../signalk/access-request';
import { SignalKSettingsService } from './signal-k-settings.service';
import { SignalKService } from './signal-k.service';

const CLIENT_ID_KEY = 'cattitude.signalk.clientId';
const PENDING_KEY = 'cattitude.signalk.accessRequest';
const POLL_MS = 5_000;
/** Stop polling after this. The request stays on the boat, and Check again resumes. */
const POLL_LIMIT_MS = 30 * 60_000;

interface PendingRequest {
  base: string;
  href: string;
  since: number;
}

/**
 * Gets this device its own Signal K token through a device access request, so nobody
 * has to copy a token between phones. The skipper approves it once on the boat.
 */
@Injectable({ providedIn: 'root' })
export class SignalKAccessService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SignalKSettingsService);
  private readonly sk = inject(SignalKService);

  readonly state = signal<AccessState>('idle');
  readonly message = signal<string>('');

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (this.readPending()) {
      this.state.set('pending');
      this.message.set('Waiting for approval on the boat.');
      this.schedule(0);
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  defaultName(): string {
    return defaultDeviceName(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  }

  async request(deviceName: string): Promise<void> {
    const base = this.sk.httpBaseUrl();
    if (!base) {
      this.fail('Save the boat server address first.');
      return;
    }
    this.stop();
    this.state.set('pending');
    this.message.set('Sending the request to the boat…');
    try {
      const reply = await firstValueFrom(this.http.post<unknown>(
        `${base}/signalk/v1/access/requests`,
        accessRequestBody(this.clientId(), deviceName || this.defaultName()),
      ));
      this.handle(base, reply);
    } catch (err) {
      const reply = err instanceof HttpErrorResponse ? err.error : null;
      const outcome = parseAccessReply(reply);
      if (outcome.state !== 'error') {
        this.handle(base, reply);
        return;
      }
      if (err instanceof HttpErrorResponse && err.status === 400) {
        // Signal K refuses a second request from the same device while one is open.
        this.fail('This device already has a request on the boat. Approve or remove it there, then try again.');
        return;
      }
      if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 501)) {
        this.fail('This boat server does not take access requests. Turn on security in the Signal K admin, or paste a token.');
        return;
      }
      this.fail('The boat server could not be reached.');
    }
  }

  /** Poll now, for example from a Check again button. */
  checkNow(): void {
    const pending = this.readPending();
    if (!pending) return;
    this.writePending({ ...pending, since: Date.now() });
    this.state.set('pending');
    this.message.set('Waiting for approval on the boat.');
    this.schedule(0);
  }

  cancel(): void {
    this.stop();
    this.clearPending();
    this.state.set('idle');
    this.message.set('');
  }

  private handle(base: string, reply: unknown): void {
    const outcome = parseAccessReply(reply);
    if (outcome.state === 'pending') {
      if (!outcome.href) {
        this.fail('The boat server did not say where to check for approval.');
        return;
      }
      this.writePending({ base, href: outcome.href, since: Date.now() });
      this.message.set('Waiting for approval. On the boat, open the Signal K admin, then Security, Access Requests.');
      this.schedule(POLL_MS);
      return;
    }
    if (outcome.state === 'approved' && outcome.token) {
      this.clearPending();
      this.settings.setToken(outcome.token);
      this.state.set('approved');
      this.message.set('Approved. This device now has its own token.');
      this.sk.connect();
      return;
    }
    this.clearPending();
    this.state.set(outcome.state);
    this.message.set(outcome.message ?? '');
  }

  private async poll(): Promise<void> {
    const pending = this.readPending();
    if (!pending) return;
    if (Date.now() - pending.since > POLL_LIMIT_MS) {
      this.message.set('Still waiting. Approve it on the boat, then press Check again.');
      return;
    }
    const url = /^https?:\/\//i.test(pending.href) ? pending.href : `${pending.base}${pending.href}`;
    try {
      const reply = await firstValueFrom(this.http.get<unknown>(url));
      this.handle(pending.base, reply);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.clearPending();
        this.fail('The request is no longer on the boat. Send it again.');
        return;
      }
      this.schedule(POLL_MS);
    }
  }

  private schedule(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.poll();
    }, delayMs);
  }

  private stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private fail(message: string): void {
    this.state.set('error');
    this.message.set(message);
  }

  private clientId(): string {
    try {
      const stored = localStorage.getItem(CLIENT_ID_KEY);
      if (stored) return stored;
      const id = newClientId();
      localStorage.setItem(CLIENT_ID_KEY, id);
      return id;
    } catch {
      return newClientId();
    }
  }

  private readPending(): PendingRequest | null {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PendingRequest>;
      if (typeof parsed.base !== 'string' || typeof parsed.href !== 'string') return null;
      return { base: parsed.base, href: parsed.href, since: Number(parsed.since) || Date.now() };
    } catch {
      return null;
    }
  }

  private writePending(pending: PendingRequest): void {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    } catch { /* The request still runs for this visit. */ }
  }

  private clearPending(): void {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch { /* ignore */ }
  }
}
