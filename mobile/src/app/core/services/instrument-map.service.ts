import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEFAULT_INSTRUMENT_MAP } from '../models/instrument-map-default';
import { InstrumentMap, InstrumentMapResponse } from '../models/instrument-map.model';
import { VesselContextService } from './vessel-context.service';

const STORAGE_KEY = 'cattitude.instrumentMap.v1';

@Injectable({ providedIn: 'root' })
export class InstrumentMapService {

  private readonly mapSubject = new BehaviorSubject<InstrumentMap>(structuredClone(DEFAULT_INSTRUMENT_MAP));
  readonly map$: Observable<InstrumentMap> = this.mapSubject.asObservable();

  private hydratePromise: Promise<void> | null = null;
  private hydrateSlug: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly vesselContext: VesselContextService,
  ) {}

  get map(): InstrumentMap {
    return this.mapSubject.value;
  }

  ensureLoaded(): Promise<void> {
    const slug = this.vesselContext.vesselSlug;
    if (this.hydratePromise && this.hydrateSlug === slug) return this.hydratePromise;
    this.hydrateSlug = slug;
    this.hydratePromise = this.hydrate(slug).catch(() => {
      this.hydratePromise = null;
      this.hydrateSlug = null;
    });
    return this.hydratePromise;
  }

  private async hydrate(slug: string): Promise<void> {
    const cached = this.readCache(slug);
    try {
      const res = await firstValueFrom(this.http.get<InstrumentMapResponse>(this.url(slug)));
      if (res.map?.instruments && Object.keys(res.map.instruments).length > 0) {
        this.apply(res.map, slug);
        return;
      }
      if (cached) {
        this.apply(cached, slug, false);
        return;
      }
      this.apply(structuredClone(DEFAULT_INSTRUMENT_MAP), slug);
    } catch {
      if (cached) {
        this.apply(cached, slug, false);
      } else {
        this.apply(structuredClone(DEFAULT_INSTRUMENT_MAP), slug, false);
      }
    }
  }

  private apply(map: InstrumentMap, slug: string, persistCache = true): void {
    this.mapSubject.next(map);
    if (persistCache) this.writeCache(slug, map);
  }

  private url(slug: string): string {
    return `${environment.apiUrl}/api/v1/vessels/${encodeURIComponent(slug)}/instrument-map`;
  }

  private cacheKey(slug: string): string {
    return `${STORAGE_KEY}:${slug}`;
  }

  private readCache(slug: string): InstrumentMap | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(slug));
      return raw ? (JSON.parse(raw) as InstrumentMap) : null;
    } catch {
      return null;
    }
  }

  private writeCache(slug: string, map: InstrumentMap): void {
    try {
      localStorage.setItem(this.cacheKey(slug), JSON.stringify(map));
    } catch { /* ignore */ }
  }
}
