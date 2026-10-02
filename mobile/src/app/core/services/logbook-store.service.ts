import { Injectable, inject } from '@angular/core';
import {
  DEFAULT_LOGBOOK_SETTINGS,
  LogEntry,
  LogbookSettings,
  Passage,
  TrackSample,
} from '../models/logbook.model';
import { clampDebounceMin, clampOffset } from '../logbook/logbook-math';
import { VesselContextService } from './vessel-context.service';

const DB_VERSION = 1;
const ENTRY_STORE = 'entries';
const SAMPLE_STORE = 'samples';
const META_STORE = 'meta';

interface MetaRow {
  key: string;
  value: unknown;
}

@Injectable({ providedIn: 'root' })
export class LogbookStoreService {
  private readonly vessel = inject(VesselContextService);
  private dbPromise: Promise<IDBDatabase> | null = null;
  private openSlug = '';

  async entries(): Promise<LogEntry[]> {
    const db = await this.open();
    const rows = await this.getAll<LogEntry>(db, ENTRY_STORE);
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }

  async saveEntry(entry: LogEntry): Promise<void> {
    const db = await this.open();
    await this.put(db, ENTRY_STORE, entry);
  }

  async passage(): Promise<Passage | null> {
    return this.meta<Passage>('passage');
  }

  async savePassage(passage: Passage): Promise<void> {
    await this.setMeta('passage', passage);
  }

  async settings(): Promise<LogbookSettings> {
    const stored = await this.meta<Partial<LogbookSettings>>('settings');
    return normalizeSettings(stored);
  }

  async saveSettings(settings: LogbookSettings): Promise<void> {
    await this.setMeta('settings', normalizeSettings(settings));
  }

  async dirtyIds(): Promise<string[]> {
    return (await this.meta<string[]>('dirty')) ?? [];
  }

  async markDirty(id: string): Promise<void> {
    const ids = new Set(await this.dirtyIds());
    ids.add(id);
    await this.setMeta('dirty', [...ids]);
  }

  async clearDirty(ids: string[]): Promise<void> {
    const drop = new Set(ids);
    const next = (await this.dirtyIds()).filter(id => !drop.has(id));
    await this.setMeta('dirty', next);
  }

  async passageDirty(): Promise<boolean> {
    return (await this.meta<boolean>('passageDirty')) === true;
  }

  async markPassageDirty(dirty: boolean): Promise<void> {
    await this.setMeta('passageDirty', dirty);
  }

  async samplesSince(sinceMs: number): Promise<TrackSample[]> {
    const db = await this.open();
    const rows = await this.getAll<TrackSample>(db, SAMPLE_STORE);
    return rows.filter(sample => sample.at >= sinceMs).sort((a, b) => a.at - b.at);
  }

  async saveSample(sample: TrackSample): Promise<void> {
    const db = await this.open();
    await this.put(db, SAMPLE_STORE, sample);
  }

  async pruneSamples(cutoffMs: number): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SAMPLE_STORE, 'readwrite');
      const store = tx.objectStore(SAMPLE_STORE);
      const req = store.openCursor(IDBKeyRange.upperBound(cutoffMs, true));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Logbook sample prune failed'));
    });
  }

  private async meta<T>(key: string): Promise<T | null> {
    const db = await this.open();
    const row = await this.get<MetaRow>(db, META_STORE, key);
    return row ? (row.value as T) : null;
  }

  private async setMeta(key: string, value: unknown): Promise<void> {
    const db = await this.open();
    await this.put(db, META_STORE, { key, value });
  }

  private open(): Promise<IDBDatabase> {
    const slug = this.vessel.vesselSlug || 'vessel';
    if (this.dbPromise && this.openSlug === slug) return this.dbPromise;
    this.openSlug = slug;
    const name = `cattitude-logbook:${slug}`;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ENTRY_STORE)) {
          const entries = db.createObjectStore(ENTRY_STORE, { keyPath: 'id' });
          entries.createIndex('byAt', 'at', { unique: false });
        }
        if (!db.objectStoreNames.contains(SAMPLE_STORE)) {
          db.createObjectStore(SAMPLE_STORE, { keyPath: 'at' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Logbook database failed to open'));
    });
    return this.dbPromise;
  }

  private getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('Logbook read failed'));
    });
  }

  private get<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error ?? new Error('Logbook read failed'));
    });
  }

  private put(db: IDBDatabase, store: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Logbook write failed'));
    });
  }
}

function normalizeSettings(raw: Partial<LogbookSettings> | null): LogbookSettings {
  const hours = raw?.intervalHours;
  const intervalHours = hours === 1 || hours === 3 || hours === 6 || hours === 12 || hours === 24
    ? hours
    : DEFAULT_LOGBOOK_SETTINGS.intervalHours;
  return {
    intervalHours,
    offsetMinutes: clampOffset(raw?.offsetMinutes ?? DEFAULT_LOGBOOK_SETTINGS.offsetMinutes),
    pauseWhenAnchored: raw?.pauseWhenAnchored ?? DEFAULT_LOGBOOK_SETTINGS.pauseWhenAnchored,
    propulsionDebounceMin: clampDebounceMin(raw?.propulsionDebounceMin ?? 2),
    sailDebounceMin: clampDebounceMin(raw?.sailDebounceMin ?? 3),
    syncEnabled: raw?.syncEnabled ?? DEFAULT_LOGBOOK_SETTINGS.syncEnabled,
  };
}
