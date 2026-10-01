import { Injectable, signal } from '@angular/core';
import { ReaderView } from '../guide/reader-view';

const STORAGE_KEY = 'cattitude.dashboard.v1';

type VesselLayouts = Partial<Record<ReaderView, string[]>>;

/**
 * Per-vessel, per-persona home layouts on this device.
 * A missing persona uses the default. An empty list is a home the person cleared.
 */
@Injectable({ providedIn: 'root' })
export class DashboardLayoutService {
  private readonly epoch = signal(0);

  saved(vesselSlug: string, view: ReaderView): string[] | undefined {
    this.epoch();
    const ids = readStore()[vesselSlug]?.[view];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : undefined;
  }

  save(vesselSlug: string, view: ReaderView, ids: string[]): void {
    const store = readStore();
    store[vesselSlug] = { ...(store[vesselSlug] ?? {}), [view]: ids };
    writeStore(store);
    this.epoch.update((value) => value + 1);
  }

  reset(vesselSlug: string, view: ReaderView): void {
    const store = readStore();
    const vessel = store[vesselSlug];
    if (vessel) {
      delete vessel[view];
      if (!vessel.guest && !vessel.crew) {
        delete store[vesselSlug];
      }
    }
    writeStore(store);
    this.epoch.update((value) => value + 1);
  }
}

function readStore(): Record<string, VesselLayouts> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, VesselLayouts>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, VesselLayouts>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode and full storage can refuse the write */
  }
}
