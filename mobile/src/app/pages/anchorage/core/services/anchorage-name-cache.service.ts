/**
 * Remembers MMSI → vessel name across sessions.
 *
 * Signal-K only streams `name` when it changes, so a vessel that was named in
 * an earlier session would otherwise display as its MMSI until the next static
 * update — which for our own boat may never come while the app is open.
 */
import { Injectable } from '@angular/core';

const STORAGE_KEY = 'cattitude.anchorage.vesselNames';
/** Bound the cache so a busy AIS area cannot grow localStorage without limit. */
const MAX_ENTRIES = 500;

@Injectable({ providedIn: 'root' })
export class AnchorageNameCacheService {
  private readonly names = new Map<string, string>();

  constructor() {
    this.load();
  }

  get(mmsi: string): string | undefined {
    return this.names.get(mmsi);
  }

  /** @returns true when this is a new or changed name. */
  remember(mmsi: string, name: string | undefined): boolean {
    const trimmed = (name ?? '').trim();
    if (!mmsi || !trimmed || trimmed === mmsi) return false;
    if (this.names.get(mmsi) === trimmed) return false;

    // Re-insert so recently seen vessels survive eviction.
    this.names.delete(mmsi);
    this.names.set(mmsi, trimmed);
    while (this.names.size > MAX_ENTRIES) {
      const oldest = this.names.keys().next().value;
      if (oldest === undefined) break;
      this.names.delete(oldest);
    }
    this.save();
    return true;
  }

  clear(): void {
    this.names.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [mmsi, name] of Object.entries(parsed)) {
        if (typeof name === 'string' && name.trim()) this.names.set(mmsi, name);
      }
    } catch { /* ignore */ }
  }

  private save(): void {
    try {
      const plain: Record<string, string> = {};
      this.names.forEach((name, mmsi) => { plain[mmsi] = name; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    } catch { /* ignore */ }
  }
}
