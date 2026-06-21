import { Injectable } from '@angular/core';
import {
  GuideManifest,
  StoredGuideRecord,
} from '../models/guide-manifest.model';

const DB_NAME = 'clever-sailor-guide';
const DB_VERSION = 1;
const META_STORE = 'meta';
const ASSET_STORE = 'assets';

@Injectable({ providedIn: 'root' })
export class GuideStoreService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private blobUrls = new Map<string, string>();

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE);
          }
          if (!db.objectStoreNames.contains(ASSET_STORE)) {
            db.createObjectStore(ASSET_STORE);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    }
    return this.dbPromise;
  }

  async getStoredGuide(vesselSlug: string): Promise<StoredGuideRecord | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const request = tx.objectStore(META_STORE).get(vesselSlug);
      request.onsuccess = () => resolve((request.result as StoredGuideRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    });
  }

  async saveGuide(
    vesselSlug: string,
    manifest: GuideManifest,
    guide: unknown,
  ): Promise<void> {
    const db = await this.openDb();
    const record: StoredGuideRecord = {
      manifest,
      contentHash: manifest.contentHash,
      guide,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put(record, vesselSlug);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    });
  }

  async saveAsset(vesselSlug: string, path: string, blob: Blob): Promise<void> {
    const db = await this.openDb();
    const key = this.assetKey(vesselSlug, path);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, 'readwrite');
      tx.objectStore(ASSET_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB asset write failed'));
    });
    this.revokeBlobUrl(key);
  }

  async getAssetBlob(vesselSlug: string, path: string): Promise<Blob | null> {
    const db = await this.openDb();
    const key = this.assetKey(vesselSlug, path);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, 'readonly');
      const request = tx.objectStore(ASSET_STORE).get(key);
      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB asset read failed'));
    });
  }

  async resolveAssetUrl(vesselSlug: string, logicalPath: string): Promise<string> {
    const blob = await this.getAssetBlob(vesselSlug, logicalPath);
    if (!blob) {
      return logicalPath;
    }
    const key = this.assetKey(vesselSlug, logicalPath);
    const existing = this.blobUrls.get(key);
    if (existing) {
      return existing;
    }
    const url = URL.createObjectURL(blob);
    this.blobUrls.set(key, url);
    return url;
  }

  private assetKey(vesselSlug: string, path: string): string {
    return `${vesselSlug}|${path}`;
  }

  private revokeBlobUrl(key: string): void {
    const existing = this.blobUrls.get(key);
    if (existing) {
      URL.revokeObjectURL(existing);
      this.blobUrls.delete(key);
    }
  }
}
