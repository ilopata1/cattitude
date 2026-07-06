import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BootstrapContent } from '../models/bootstrap-content.model';
import { GuideManifest } from '../models/guide-manifest.model';
import { environment } from '../../../environments/environment';
import { GuideStoreService } from './guide-store.service';

const ASSET_PATH_RE = /assets\/images\/[^\s"'<>]+/g;

@Injectable({ providedIn: 'root' })
export class GuideSyncService {
  constructor(
    private readonly http: HttpClient,
    private readonly store: GuideStoreService,
  ) {}

  async loadFromCache(vesselSlug: string): Promise<BootstrapContent | null> {
    const stored = await this.store.getStoredGuide(vesselSlug);
    if (!stored?.guide) {
      return null;
    }
    return this.rewriteAssetUrls(vesselSlug, stored.guide as BootstrapContent);
  }

  async ensureGuide(vesselSlug: string): Promise<BootstrapContent> {
    const manifest = await this.fetchManifest(vesselSlug);
    const stored = await this.store.getStoredGuide(vesselSlug);

    if (stored?.contentHash === manifest.contentHash) {
      return this.rewriteAssetUrls(vesselSlug, stored.guide as BootstrapContent);
    }

    const guide = await this.fetchBundle(vesselSlug);
    await this.syncAssets(vesselSlug, manifest, stored?.manifest ?? null);
    await this.store.saveGuide(vesselSlug, manifest, guide);
    return this.rewriteAssetUrls(vesselSlug, guide);
  }

  private manifestUrl(vesselSlug: string): string {
    return `${environment.apiUrl}/api/v1/vessels/${vesselSlug}/guide/manifest`;
  }

  private bundleUrl(vesselSlug: string): string {
    return `${environment.apiUrl}/api/v1/vessels/${vesselSlug}/guide/bundle.json`;
  }

  private assetUrl(vesselSlug: string, path: string): string {
    return `${environment.apiUrl}/api/v1/vessels/${vesselSlug}/guide/assets/${path}`;
  }

  private async fetchManifest(vesselSlug: string): Promise<GuideManifest> {
    return firstValueFrom(this.http.get<GuideManifest>(this.manifestUrl(vesselSlug)));
  }

  private async fetchBundle(vesselSlug: string): Promise<BootstrapContent> {
    return firstValueFrom(this.http.get<BootstrapContent>(this.bundleUrl(vesselSlug)));
  }

  private async syncAssets(
    vesselSlug: string,
    manifest: GuideManifest,
    previous: GuideManifest | null,
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

      const blob = await firstValueFrom(
        this.http.get(this.assetUrl(vesselSlug, asset.path), { responseType: 'blob' }),
      );
      await this.store.saveAsset(vesselSlug, asset.path, blob);
    }
  }

  private async rewriteAssetUrls(
    vesselSlug: string,
    content: BootstrapContent,
  ): Promise<BootstrapContent> {
    const cloned = structuredClone(content) as BootstrapContent;

    if (cloned.branding?.headerLogo) {
      cloned.branding.headerLogo = await this.store.resolveAssetUrl(
        vesselSlug,
        cloned.branding.headerLogo,
      );
    }
    if (cloned.branding?.heroLogo) {
      cloned.branding.heroLogo = await this.store.resolveAssetUrl(
        vesselSlug,
        cloned.branding.heroLogo,
      );
    }

    await this.rewriteHtmlAssets(vesselSlug, cloned.systems);
    return cloned;
  }

  private async rewriteHtmlAssets(
    vesselSlug: string,
    modules: Record<string, { sections?: { html?: string }[] }> | undefined,
  ): Promise<void> {
    if (!modules) {
      return;
    }

    for (const module of Object.values(modules)) {
      for (const section of module.sections ?? []) {
        if (!section.html) {
          continue;
        }
        section.html = await this.replaceAssetPaths(vesselSlug, section.html);
      }
    }
  }

  private async replaceAssetPaths(vesselSlug: string, html: string): Promise<string> {
    const paths = [...new Set(html.match(ASSET_PATH_RE) ?? [])];
    let updated = html;
    for (const path of paths) {
      const resolved = await this.store.resolveAssetUrl(vesselSlug, path);
      if (resolved !== path) {
        updated = updated.split(path).join(resolved);
      }
    }
    return updated;
  }
}
