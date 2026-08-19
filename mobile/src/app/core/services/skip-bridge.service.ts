/**
 * SkipBridgeService
 *
 * Writes Skip's per-device localStorage key (`skip.connectionConfig`) before
 * the Skip iframe loads, so Skip picks up the Signal-K URL that the user
 * configured in Cattitude's Settings page without requiring a separate
 * connection setup step inside Skip.
 *
 * Skip stores its connection config as a versioned JSON object:
 *   localStorage['skip.connectionConfig'] = JSON.stringify({
 *     configVersion: 13,
 *     skipUUID: "<uuid>",
 *     signalKUrl: "https://...",
 *     proxyEnabled: false,
 *     signalKSubscribeAll: false,
 *     remoteContextDemand: {},
 *     sharedConfigName: "default",
 *     isRemoteControl: false,
 *     instanceName: ""
 *   })
 *
 * The bridge reads/preserves the existing skipUUID (device identity) so the
 * signal-K server can recognise returning clients, and only updates signalKUrl
 * when the Cattitude URL differs from what Skip already has stored.
 *
 * Ref: halos-org/skip src/app/core/constants/config-storage.const.ts
 *      src/app/core/constants/config-versions.const.ts (CONNECTION_CONFIG_VERSION = 13)
 */
import { Injectable } from '@angular/core';
import { SignalKSettingsService } from './signal-k-settings.service';

const SKIP_CONNECTION_KEY = 'skip.connectionConfig';
const CONNECTION_CONFIG_VERSION = 13;

interface SkipConnectionConfig {
  configVersion: number;
  skipUUID: string;
  signalKUrl: string;
  proxyEnabled: boolean;
  signalKSubscribeAll: boolean;
  remoteContextDemand: Record<string, boolean>;
  sharedConfigName: string;
  isRemoteControl: boolean;
  instanceName: string;
}

@Injectable({ providedIn: 'root' })
export class SkipBridgeService {

  constructor(private readonly skSettings: SignalKSettingsService) {}

  /**
   * Sync Cattitude's Signal-K URL into Skip's localStorage config.
   * Call this just before rendering the Skip iframe.
   *
   * Returns true if the config was written/updated, false if nothing changed.
   */
  syncConnectionConfig(): boolean {
    const url = this.skSettings.url;
    const existing = this.readExistingConfig();

    if (existing?.signalKUrl === url && existing?.configVersion === CONNECTION_CONFIG_VERSION) {
      return false;
    }

    const config: SkipConnectionConfig = {
      configVersion: CONNECTION_CONFIG_VERSION,
      skipUUID: existing?.skipUUID ?? this.generateUUID(),
      signalKUrl: url,
      proxyEnabled: false,
      signalKSubscribeAll: false,
      remoteContextDemand: existing?.remoteContextDemand ?? {},
      sharedConfigName: existing?.sharedConfigName ?? 'default',
      isRemoteControl: false,
      instanceName: '',
    };

    try {
      localStorage.setItem(SKIP_CONNECTION_KEY, JSON.stringify(config));
      return true;
    } catch {
      return false;
    }
  }

  /** Read Skip's stored URL (if any). Useful for detecting drift. */
  getSkipStoredUrl(): string | null {
    return this.readExistingConfig()?.signalKUrl ?? null;
  }

  private readExistingConfig(): SkipConnectionConfig | null {
    try {
      const raw = localStorage.getItem(SKIP_CONNECTION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SkipConnectionConfig;
      return typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Simple RFC4122 v4 UUID generator — no crypto dependency needed. */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
