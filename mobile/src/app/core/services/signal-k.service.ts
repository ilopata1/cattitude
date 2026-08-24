/**
 * Shared Signal-K WebSocket service.
 *
 * Opens a single connection to the configured Signal-K server and distributes
 * the delta stream to all live-data consumers (Skip adapter, anchorage page,
 * polar service, notification bridge).
 *
 * Connection lifecycle:
 *  - Connects automatically when a URL is set in SignalKSettingsService
 *    (defaults to http://localhost:3000 if none has been saved).
 *  - Auto-reconnects with exponential back-off (cap: 30 s) on any close/error.
 *  - Stops reconnecting when the URL is cleared.
 *  - Call connect() explicitly after setting a new URL.
 *
 * Cloudflare tunnel support:
 *  - https:// → wss://   (promoted automatically)
 *  - http://  → ws://
 */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SignalKSettingsService } from './signal-k-settings.service';

export interface SignalKDelta {
  context: string;
  updates: SignalKUpdate[];
}

export interface SignalKUpdate {
  source?: { label?: string; type?: string; };
  timestamp?: string;
  values: SignalKValue[];
}

export interface SignalKValue {
  path: string;
  value: unknown;
}

export type SignalKConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_CAP_MS  = 30_000;
const SK_STREAM_PATH    = '/signalk/v1/stream?subscribe=all';

@Injectable({ providedIn: 'root' })
export class SignalKService implements OnDestroy {

  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private readonly stateSubject  = new BehaviorSubject<SignalKConnectionState>('disconnected');
  private readonly deltaSubject  = new Subject<SignalKDelta>();
  private readonly selfSubject   = new BehaviorSubject<string>('');
  private readonly errorSubject  = new Subject<string>();

  /** Current connection state as an observable. */
  readonly state$: Observable<SignalKConnectionState> = this.stateSubject.asObservable();

  /** Convenience: true when state is 'connected'. */
  readonly connected$: Observable<boolean> = new Observable(obs => {
    return this.stateSubject.subscribe(s => obs.next(s === 'connected'));
  });

  /** Raw Signal-K delta messages. */
  readonly delta$: Observable<SignalKDelta> = this.deltaSubject.asObservable();

  /** Own vessel context string from the SK hello message (e.g. "vessels.urn:mrn:imo:mmsi:123456789"). */
  readonly self$: Observable<string> = this.selfSubject.asObservable();

  /** Most recent human-readable error string, if any. */
  readonly error$: Observable<string> = this.errorSubject.asObservable();

  get state(): SignalKConnectionState {
    return this.stateSubject.value;
  }

  get self(): string {
    return this.selfSubject.value;
  }

  constructor(private readonly settings: SignalKSettingsService) {
    // Auto-connect when a URL is already stored.
    if (settings.url) {
      this.connect();
    }
  }

  /**
   * Open (or re-open) a connection to the currently configured URL.
   * Safe to call multiple times — closes any existing socket first.
   */
  connect(): void {
    this.cancelReconnect();
    this.closeSocket();

    const url = this.settings.url;
    if (!url) return;

    const wsUrl = this.toWsUrl(url);
    if (!wsUrl) {
      this.stateSubject.next('error');
      this.errorSubject.next(`Invalid Signal-K URL: "${url}"`);
      return;
    }

    this.stateSubject.next('connecting');

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      this.handleError(`WebSocket creation failed: ${String(e)}`);
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.stateSubject.next('connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch {
        // Ignore non-JSON frames (heartbeat pings, etc.)
      }
    };

    this.ws.onerror = () => {
      this.handleError('WebSocket error');
    };

    this.ws.onclose = (event: CloseEvent) => {
      if (this.stateSubject.value !== 'error') {
        this.stateSubject.next('disconnected');
      }
      if (!this.destroyed && this.settings.url) {
        this.scheduleReconnect();
      }
    };
  }

  /** Disconnect and stop reconnecting. */
  disconnect(): void {
    this.cancelReconnect();
    this.closeSocket();
    this.stateSubject.next('disconnected');
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  // ---------------------------------------------------------------------------

  private handleMessage(msg: Record<string, unknown>): void {
    // Signal-K hello / welcome message carries the self context.
    if (msg['self'] && !msg['updates']) {
      this.selfSubject.next(msg['self'] as string);
      return;
    }
    // Delta message.
    if (msg['updates']) {
      this.deltaSubject.next(msg as unknown as SignalKDelta);
    }
  }

  private handleError(reason: string): void {
    this.stateSubject.next('error');
    this.errorSubject.next(reason);
    if (!this.destroyed && this.settings.url) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
      RECONNECT_CAP_MS,
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed && this.settings.url) {
        this.connect();
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeSocket(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  /**
   * Convert any http(s):// or bare host URL to a ws(s):// stream URL.
   * Returns null when the input is unparseable.
   */
  private toWsUrl(input: string): string | null {
    let base = input.trim().replace(/\/+$/, '');

    // Add a scheme if the user typed a bare host:port.
    if (!/^(https?|wss?):\/\//i.test(base)) {
      const hasPort = /:\d+/.test(base);
      base = hasPort ? `http://${base}` : `http://${base}:3000`;
    }

    try {
      const parsed = new URL(base);
      const scheme = (parsed.protocol === 'https:' || parsed.protocol === 'wss:')
        ? 'wss:' : 'ws:';
      return `${scheme}//${parsed.host}${SK_STREAM_PATH}`;
    } catch {
      return null;
    }
  }
}
