/**
 * Coach memory on this phone. One database per vessel, same shape as the logbook store.
 */
import { Injectable, inject } from '@angular/core';
import { AbReport } from '../ab-test/ab-test';
import {
  CoachAbRecord,
  CoachSummary,
  RememberedPassage,
  keepSummaries,
  prunePassages,
} from '../coach/coach-memory';
import { COACH_SUMMARY_RETAIN_MS } from '../coach/coach-settings';
import { VesselContextService } from './vessel-context.service';

const DB_VERSION = 1;
const TEST_STORE = 'tests';
const SUMMARY_STORE = 'summaries';
const META_STORE = 'meta';

export interface StoredCoachTest extends CoachAbRecord {
  report: AbReport;
}

interface MetaRow {
  key: string;
  value: unknown;
}

export interface CoachMemory {
  tests: CoachAbRecord[];
  summaries: CoachSummary[];
  passages: RememberedPassage[];
}

@Injectable({ providedIn: 'root' })
export class CoachStoreService {
  private readonly vessel = inject(VesselContextService);
  private dbPromise: Promise<IDBDatabase> | null = null;
  private openSlug = '';

  async load(): Promise<CoachMemory> {
    const db = await this.open();
    const tests = await this.getAll<StoredCoachTest>(db, TEST_STORE);
    const summaries = await this.getAll<CoachSummary>(db, SUMMARY_STORE);
    const passages = (await this.meta<RememberedPassage[]>(db, 'passages')) ?? [];
    return {
      tests: tests.sort((a, b) => b.finishedAt - a.finishedAt),
      summaries: summaries.sort((a, b) => a.at - b.at),
      passages,
    };
  }

  async saveTest(record: StoredCoachTest): Promise<void> {
    const db = await this.open();
    await this.put(db, TEST_STORE, record);
  }

  async saveMemory(
    summary: CoachSummary | null,
    passages: RememberedPassage[],
    nowMs: number,
  ): Promise<CoachMemory> {
    const db = await this.open();
    if (summary) await this.put(db, SUMMARY_STORE, summary);
    const storedPassages = prunePassages(passages, nowMs, COACH_SUMMARY_RETAIN_MS);
    await this.put(db, META_STORE, { key: 'passages', value: storedPassages });
    const summaries = keepSummaries(
      await this.getAll<CoachSummary>(db, SUMMARY_STORE),
      storedPassages,
      nowMs,
    );
    const keepAt = new Set(summaries.map(row => row.at));
    for (const row of await this.getAll<CoachSummary>(db, SUMMARY_STORE)) {
      if (!keepAt.has(row.at)) await this.remove(db, SUMMARY_STORE, row.at);
    }
    const tests = await this.getAll<StoredCoachTest>(db, TEST_STORE);
    return {
      tests: tests.sort((a, b) => b.finishedAt - a.finishedAt),
      summaries: summaries.sort((a, b) => a.at - b.at),
      passages: storedPassages,
    };
  }

  private async meta<T>(db: IDBDatabase, key: string): Promise<T | null> {
    const row = await this.get<MetaRow>(db, META_STORE, key);
    return row ? (row.value as T) : null;
  }

  private open(): Promise<IDBDatabase> {
    const slug = this.vessel.vesselSlug || 'vessel';
    if (this.dbPromise && this.openSlug === slug) return this.dbPromise;
    this.openSlug = slug;
    const name = `cattitude-coach:${slug}`;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TEST_STORE)) {
          db.createObjectStore(TEST_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SUMMARY_STORE)) {
          db.createObjectStore(SUMMARY_STORE, { keyPath: 'at' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Coach database failed to open'));
    });
    return this.dbPromise;
  }

  private getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('Coach read failed'));
    });
  }

  private get<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error ?? new Error('Coach read failed'));
    });
  }

  private put(db: IDBDatabase, store: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Coach write failed'));
    });
  }

  private remove(db: IDBDatabase, store: string, key: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Coach delete failed'));
    });
  }
}
