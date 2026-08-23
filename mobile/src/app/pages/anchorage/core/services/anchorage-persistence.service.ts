/**
 * Persist anchorage vessel tracks in IndexedDB (PWA-friendly; no Capacitor SQLite).
 */
import { Injectable } from '@angular/core';
import { Vessel, VesselPosition } from '../models/vessel.model';

const DB_NAME = 'cattitude-anchorage';
const DB_VERSION = 1;
const VESSEL_STORE = 'vessels';
const POSITION_STORE = 'positions';

interface StoredVesselMeta {
  mmsi: string;
  name: string;
  lengthMetres: number;
  beamMetres: number;
  isOwn: boolean;
  lastUpdated: number;
  anchorLat: number | null;
  anchorLon: number | null;
  swingRadius: number;
  confidence: Vessel['confidence'];
}

@Injectable({ providedIn: 'root' })
export class AnchoragePersistenceService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(VESSEL_STORE)) {
            db.createObjectStore(VESSEL_STORE, { keyPath: 'mmsi' });
          }
          if (!db.objectStoreNames.contains(POSITION_STORE)) {
            const store = db.createObjectStore(POSITION_STORE, { keyPath: ['mmsi', 'timestamp'] });
            store.createIndex('byMmsi', 'mmsi', { unique: false });
            store.createIndex('byTimestamp', 'timestamp', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Anchorage IDB open failed'));
      });
    }
    return this.dbPromise;
  }

  async saveSnapshot(vessels: Vessel[]): Promise<void> {
    try {
      const db = await this.openDb();
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([VESSEL_STORE, POSITION_STORE], 'readwrite');
        const vesselStore = tx.objectStore(VESSEL_STORE);
        const posStore = tx.objectStore(POSITION_STORE);

        for (const v of vessels) {
          if (!v.tracked && v.positions.length === 0) continue;
          const meta: StoredVesselMeta = {
            mmsi: v.mmsi,
            name: v.name,
            lengthMetres: v.lengthMetres,
            beamMetres: v.beamMetres,
            isOwn: v.isOwn,
            lastUpdated: v.lastUpdated,
            anchorLat: v.anchorPoint?.lat ?? null,
            anchorLon: v.anchorPoint?.lon ?? null,
            swingRadius: v.swingRadius,
            confidence: v.confidence,
          };
          vesselStore.put(meta);
          for (const p of v.positions) {
            if (p.timestamp < cutoff) continue;
            posStore.put({ mmsi: v.mmsi, ...p });
          }
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Anchorage IDB write failed'));
      });
      await this.pruneOld(cutoff);
    } catch (err) {
      console.warn('Anchorage persistence save failed', err);
    }
  }

  async loadRecentVessels(): Promise<Vessel[]> {
    try {
      const db = await this.openDb();
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const metas = await this.getAll<StoredVesselMeta>(db, VESSEL_STORE);
      const vessels: Vessel[] = [];

      for (const meta of metas) {
        if (meta.lastUpdated < cutoff) continue;
        const positions = await this.getPositionsForMmsi(db, meta.mmsi, cutoff);
        if (positions.length === 0 && !meta.isOwn) continue;
        vessels.push({
          mmsi: meta.mmsi,
          name: meta.name,
          lengthMetres: meta.lengthMetres,
          beamMetres: meta.beamMetres,
          positions,
          anchorPoint:
            meta.anchorLat != null && meta.anchorLon != null
              ? { lat: meta.anchorLat, lon: meta.anchorLon }
              : null,
          swingRadius: meta.swingRadius,
          confidence: meta.confidence,
          state: 'unknown',
          isOwn: meta.isOwn,
          lastUpdated: meta.lastUpdated,
          tracked: false,
        });
      }
      return vessels;
    } catch (err) {
      console.warn('Anchorage persistence load failed', err);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([VESSEL_STORE, POSITION_STORE], 'readwrite');
        tx.objectStore(VESSEL_STORE).clear();
        tx.objectStore(POSITION_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Anchorage IDB clear failed'));
      });
    } catch { /* ignore */ }
  }

  private async pruneOld(cutoff: number): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(POSITION_STORE, 'readwrite');
      const index = tx.objectStore(POSITION_STORE).index('byTimestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const req = index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Anchorage IDB prune failed'));
    });
  }

  private getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('IDB getAll failed'));
    });
  }

  private getPositionsForMmsi(
    db: IDBDatabase,
    mmsi: string,
    cutoff: number,
  ): Promise<VesselPosition[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(POSITION_STORE, 'readonly');
      const index = tx.objectStore(POSITION_STORE).index('byMmsi');
      const req = index.getAll(mmsi);
      req.onsuccess = () => {
        const rows = (req.result as (VesselPosition & { mmsi: string })[]) ?? [];
        resolve(
          rows
            .filter(r => r.timestamp >= cutoff)
            .map(({ lat, lon, heading, sog, timestamp }) => ({
              lat, lon, heading, sog, timestamp,
            }))
            .sort((a, b) => a.timestamp - b.timestamp),
        );
      };
      req.onerror = () => reject(req.error ?? new Error('IDB positions failed'));
    });
  }
}
