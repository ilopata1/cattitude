import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, firstValueFrom, takeUntil, timeout } from 'rxjs';
import { BootstrapContent } from '../models/bootstrap-content.model';
import {
  BOOTSTRAP_SCHEMA_VERSION,
  BootstrapSchemaError,
  assertBootstrapSchema,
} from '../models/bootstrap-schema';
import { GuideManifest } from '../models/guide-manifest.model';
import { environment } from '../../../environments/environment';
import { GuideStoreService } from './guide-store.service';

const ASSET_PATH_RE = /assets\/images\/[^\s"'<>]+/g;

/** Bound for a background publication check. A hung marina link must not outlive this. */
export const GUIDE_REVALIDATE_TIMEOUT_MS = 5000;

export interface CachedGuide {
  content: BootstrapContent;
  contentHash: string;
}

export interface EnsuredGuide {
  content: BootstrapContent;
  contentHash: string;
  /** False when the phone already has this publication. */
  updated: boolean;
}

@Injectable({ providedIn: 'root' })
export class GuideSyncService {
  constructor(
    private readonly http: HttpClient,
    private readonly store: GuideStoreService,
  ) {}

  async loadFromCache(vesselSlug: string): Promise<CachedGuide | null> {
    try {
      const stored = await this.store.getStoredGuide(vesselSlug);
      if (!stored?.guide) {
        return null;
      }
      const content = await this.rewriteAssetUrls(vesselSlug, stored.guide as BootstrapContent);
      return { content, contentHash: stored.contentHash };
    } catch (error) {
      console.warn('Guide cache read failed.', error);
      return null;
    }
  }

  async fetchBundleFromApi(vesselSlug: string): Promise<BootstrapContent> {
    // No manifest hash available here; bust caches with a timestamp instead.
    const guide = await this.fetchBundle(vesselSlug, `${Date.now()}`, new AbortController().signal);
    assertBootstrapSchema(guide);
    return this.rewriteAssetUrls(vesselSlug, guide);
  }

  /**
   * Network revalidation. Resolves with the publication, or rejects at
   * {@link GUIDE_REVALIDATE_TIMEOUT_MS} and aborts the in-flight request.
   * Callers that already painted a cached guide should not await this.
   */
  async ensureGuide(vesselSlug: string): Promise<EnsuredGuide> {
    const abort = new AbortController();
    const run = new Observable<EnsuredGuide>((subscriber) => {
      void this.syncGuide(vesselSlug, abort.signal).then(
        (value) => {
          if (!subscriber.closed) {
            subscriber.next(value);
            subscriber.complete();
          }
        },
        (error: unknown) => {
          if (!subscriber.closed) {
            subscriber.error(error);
          }
        },
      );
      return () => abort.abort();
    });
    return firstValueFrom(run.pipe(timeout(GUIDE_REVALIDATE_TIMEOUT_MS)));
  }

  private async syncGuide(vesselSlug: string, signal: AbortSignal): Promise<EnsuredGuide> {
    const manifest = await this.fetchManifest(vesselSlug, signal);
    if (
      typeof manifest.schemaVersion === 'number' &&
      manifest.schemaVersion !== BOOTSTRAP_SCHEMA_VERSION
    ) {
      throw new BootstrapSchemaError(manifest.schemaVersion);
    }
    let stored = null;
    try {
      stored = await this.store.getStoredGuide(vesselSlug);
    } catch (error) {
      console.warn('Guide cache read failed.', error);
    }
    this.throwIfAborted(signal);

    if (stored?.guide && stored.contentHash === manifest.contentHash) {
      assertBootstrapSchema(stored.guide);
      return {
        content: await this.rewriteAssetUrls(vesselSlug, stored.guide as BootstrapContent),
        contentHash: manifest.contentHash,
        updated: false,
      };
    }

    const guide = await this.fetchBundle(vesselSlug, manifest.contentHash, signal);
    this.throwIfAborted(signal);
    assertBootstrapSchema(guide);
    try {
      await this.syncAssets(vesselSlug, manifest, stored?.manifest ?? null, signal);
      this.throwIfAborted(signal);
      await this.store.saveGuide(vesselSlug, manifest, guide);
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      console.warn('Guide cache write failed; continuing with network bundle.', error);
    }
    return {
      content: await this.rewriteAssetUrls(vesselSlug, guide),
      contentHash: manifest.contentHash,
      updated: true,
    };
  }

  private manifestUrl(vesselSlug: string): string {
    return `${environment.apiUrl}/api/v1/vessels/${vesselSlug}/guide/manifest`;
  }

  /**
   * The bundle is served with a long max-age; a version-specific query param
   * guarantees the browser HTTP cache can never return a previous publication
   * (which would then be stored in IndexedDB under the new content hash).
   */
  private bundleUrl(vesselSlug: string, cacheKey: string): string {
    const version = encodeURIComponent(cacheKey);
    return `${environment.apiUrl}/api/v1/vessels/${vesselSlug}/guide/bundle.json?v=${version}`;
  }

  private assetUrl(vesselSlug: string, path: string): string {
    const encoded = path
      .replace(/^\/+/, '')
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `${environment.apiUrl}/api/v1/vessels/${vesselSlug}/guide/assets/${encoded}`;
  }

  private async fetchManifest(vesselSlug: string, signal: AbortSignal): Promise<GuideManifest> {
    return this.getJson<GuideManifest>(this.manifestUrl(vesselSlug), signal);
  }

  private async fetchBundle(
    vesselSlug: string,
    cacheKey: string,
    signal: AbortSignal,
  ): Promise<BootstrapContent> {
    return this.getJson<BootstrapContent>(this.bundleUrl(vesselSlug, cacheKey), signal);
  }

  private async syncAssets(
    vesselSlug: string,
    manifest: GuideManifest,
    previous: GuideManifest | null,
    signal: AbortSignal,
  ): Promise<void> {
    const previousHashes = new Map(
      (previous?.assets ?? []).map((asset) => [asset.path, asset.hash]),
    );

    for (const asset of manifest.assets) {
      if (asset.missing || !asset.hash) {
        continue;
      }
      if (previousHashes.get(asset.path) === asset.hash) {
        continue;
      }

      const blob = await this.getBlob(this.assetUrl(vesselSlug, asset.path), signal);
      await this.store.saveAsset(vesselSlug, asset.path, blob);
    }
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new DOMException('Guide revalidation aborted.', 'AbortError');
    }
  }

  private async getJson<T>(url: string, signal: AbortSignal): Promise<T> {
    return this.request(this.http.get<T>(url), signal);
  }

  private async getBlob(url: string, signal: AbortSignal): Promise<Blob> {
    return this.request(this.http.get(url, { responseType: 'blob' }), signal);
  }

  /** Unsubscribing aborts the HttpClient request, which is what a hung TCP call needs. */
  private async request<T>(source: Observable<T>, signal: AbortSignal): Promise<T> {
    this.throwIfAborted(signal);
    const stop = new Subject<void>();
    const onAbort = () => stop.next();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      return await firstValueFrom(source.pipe(takeUntil(stop)));
    } catch (error) {
      if (signal.aborted) {
        throw new DOMException('Guide revalidation aborted.', 'AbortError');
      }
      throw error;
    } finally {
      signal.removeEventListener('abort', onAbort);
      stop.complete();
    }
  }

  private async rewriteAssetUrls(
    vesselSlug: string,
    content: BootstrapContent,
  ): Promise<BootstrapContent> {
    const cloned = structuredClone(content) as BootstrapContent;
    await this.rewriteAssetValue(vesselSlug, cloned);
    return cloned;
  }

  /** Logos, system HTML, fix-card steps, and shared diagrams such as knots. */
  private async rewriteAssetValue(vesselSlug: string, value: unknown): Promise<void> {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        const item = value[index];
        if (typeof item === 'string') {
          value[index] = await this.replaceAssetPaths(vesselSlug, item);
        } else if (item && typeof item === 'object') {
          await this.rewriteAssetValue(vesselSlug, item);
        }
      }
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const item = record[key];
      if (typeof item === 'string') {
        record[key] = await this.replaceAssetPaths(vesselSlug, item);
      } else if (item && typeof item === 'object') {
        await this.rewriteAssetValue(vesselSlug, item);
      }
    }
  }

  private async replaceAssetPaths(vesselSlug: string, html: string): Promise<string> {
    const paths = [...new Set(html.match(ASSET_PATH_RE) ?? [])];
    let updated = html;
    for (const path of paths) {
      const resolved = await this.resolveDisplayUrl(vesselSlug, path);
      if (resolved !== path) {
        updated = updated.split(path).join(resolved);
      }
    }
    return updated;
  }

  /**
   * Prefer a cached blob URL. If the file is not in IndexedDB (common for
   * Supernova logos, which are not in the GitHub Pages bundle), use the API.
   */
  private async resolveDisplayUrl(vesselSlug: string, logicalPath: string): Promise<string> {
    const resolved = await this.store.resolveAssetUrl(vesselSlug, logicalPath);
    if (resolved !== logicalPath) {
      return resolved;
    }
    if (logicalPath.startsWith('assets/')) {
      return this.assetUrl(vesselSlug, logicalPath);
    }
    return logicalPath;
  }
}
