import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BootstrapSchemaError } from '../models/bootstrap-schema';
import { GuideManifest } from '../models/guide-manifest.model';
import {
  GUIDE_DOWNLOAD_TIMEOUT_MS,
  GUIDE_REVALIDATE_TIMEOUT_MS,
  GuideSyncService,
} from './guide-sync.service';
import { GuideStoreService } from './guide-store.service';

describe('GuideSyncService.ensureGuide', () => {
  let service: GuideSyncService;
  let http: HttpTestingController;
  let store: jasmine.SpyObj<GuideStoreService>;

  beforeEach(() => {
    store = jasmine.createSpyObj('GuideStoreService', [
      'getStoredGuide',
      'saveGuide',
      'saveAsset',
      'getAssetBlob',
      'resolveAssetUrl',
    ]);
    store.getStoredGuide.and.resolveTo(null);
    store.saveGuide.and.resolveTo();
    store.getAssetBlob.and.resolveTo(null);
    store.saveAsset.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        GuideSyncService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GuideStoreService, useValue: store },
      ],
    });
    service = TestBed.inject(GuideSyncService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('aborts a hung manifest at 5 seconds', fakeAsync(() => {
    let rejected: unknown;
    void service.ensureGuide('cattitude').then(
      () => fail('expected the hung manifest to time out'),
      (error: unknown) => {
        rejected = error;
      },
    );

    const req = http.expectOne(
      `${environment.apiUrl}/api/v1/vessels/cattitude/guide/manifest`,
    );
    tick(GUIDE_REVALIDATE_TIMEOUT_MS - 1);
    expect(rejected).toBeUndefined();
    expect(req.cancelled).toBeFalse();

    tick(1);
    flushMicrotasks();

    expect(req.cancelled).toBeTrue();
    expect(rejected).toBeInstanceOf(TimeoutError);
  }));

  it('does not download a bundle whose manifest schema this app cannot read', fakeAsync(() => {
    let rejected: unknown;
    void service.ensureGuide('cattitude').then(
      () => fail('expected a schema mismatch'),
      (error: unknown) => {
        rejected = error;
      },
    );

    http.expectOne(`${environment.apiUrl}/api/v1/vessels/cattitude/guide/manifest`).flush(
      manifest({ schemaVersion: 2 }),
    );
    flushMicrotasks();

    http.expectNone((req) => req.url.includes('bundle.json'));
    expect(rejected).toBeInstanceOf(BootstrapSchemaError);
    expect((rejected as BootstrapSchemaError).actual).toBe(2);
    expect(store.saveGuide).not.toHaveBeenCalled();
  }));

  it('does not store a bundle whose schemaVersion this app cannot read', fakeAsync(() => {
    let rejected: unknown;
    void service.ensureGuide('cattitude').then(
      () => fail('expected a schema mismatch'),
      (error: unknown) => {
        rejected = error;
      },
    );

    http.expectOne(`${environment.apiUrl}/api/v1/vessels/cattitude/guide/manifest`).flush(
      manifest({ schemaVersion: null }),
    );
    flushMicrotasks();

    const bundle = http.expectOne((req) => req.url.includes('bundle.json'));
    bundle.flush({ schemaVersion: 2 });
    flushMicrotasks();

    expect(rejected).toBeInstanceOf(BootstrapSchemaError);
    expect(store.saveGuide).not.toHaveBeenCalled();
  }));

  it('stores a publication that predates schemaVersion', fakeAsync(() => {
    let resolved = false;
    void service.ensureGuide('cattitude').then(() => {
      resolved = true;
    });

    http.expectOne(`${environment.apiUrl}/api/v1/vessels/cattitude/guide/manifest`).flush(
      manifest({}),
    );
    flushMicrotasks();

    const bundle = http.expectOne((req) => req.url.includes('bundle.json'));
    bundle.flush({ vesselSlug: 'cattitude' });
    flushMicrotasks();

    expect(resolved).toBeTrue();
    expect(store.saveGuide).toHaveBeenCalled();
  }));

  it('returns the guide before its images finish downloading', fakeAsync(() => {
    let resolved = false;
    void service.ensureGuide('cattitude').then(() => {
      resolved = true;
    });

    http.expectOne(manifestUrl()).flush(manifest({ assets: [assetEntry()] }));
    flushMicrotasks();
    http.expectOne((req) => req.url.includes('bundle.json')).flush({ vesselSlug: 'cattitude' });
    flushMicrotasks();

    expect(resolved).toBeTrue();
    expect(store.saveGuide).toHaveBeenCalled();
    const assetReq = http.expectOne((req) => req.url.includes('/guide/assets/'));
    tick(GUIDE_REVALIDATE_TIMEOUT_MS);
    flushMicrotasks();
    expect(assetReq.cancelled).toBeFalse();

    assetReq.flush(new Blob(['png']));
    flushMicrotasks();
    expect(store.saveAsset).toHaveBeenCalled();
  }));

  it('still returns the guide when an image download fails', fakeAsync(() => {
    spyOn(console, 'warn');
    let resolved = false;
    let rejected: unknown;
    void service.ensureGuide('cattitude').then(
      () => {
        resolved = true;
      },
      (error: unknown) => {
        rejected = error;
      },
    );

    http.expectOne(manifestUrl()).flush(manifest({ assets: [assetEntry()] }));
    flushMicrotasks();
    http.expectOne((req) => req.url.includes('bundle.json')).flush({ vesselSlug: 'cattitude' });
    flushMicrotasks();

    expect(resolved).toBeTrue();
    const assetReq = http.expectOne((req) => req.url.includes('/guide/assets/'));
    assetReq.error(new ProgressEvent('error'));
    flushMicrotasks();
    expect(rejected).toBeUndefined();
  }));

  it('downloads an image that is missing even when the publication is unchanged', fakeAsync(() => {
    const published = manifest({ assets: [assetEntry()] });
    store.getStoredGuide.and.resolveTo({
      manifest: published,
      contentHash: 'abc',
      guide: { vesselSlug: 'cattitude' },
    });

    void service.ensureGuide('cattitude');
    http.expectOne(manifestUrl()).flush(published);
    flushMicrotasks();

    http.expectNone((req) => req.url.includes('bundle.json'));
    const assetReq = http.expectOne((req) => req.url.includes('/guide/assets/'));
    assetReq.flush(new Blob(['png']));
    flushMicrotasks();
    expect(store.saveAsset).toHaveBeenCalled();
  }));

  it('skips an image this browser already stored', fakeAsync(() => {
    const published = manifest({ assets: [assetEntry()] });
    store.getStoredGuide.and.resolveTo({
      manifest: published,
      contentHash: 'abc',
      guide: { vesselSlug: 'cattitude' },
    });
    store.getAssetBlob.and.resolveTo(new Blob(['png']));

    void service.ensureGuide('cattitude');
    http.expectOne(manifestUrl()).flush(published);
    flushMicrotasks();

    http.expectNone((req) => req.url.includes('bundle.json'));
    http.expectNone((req) => req.url.includes('/guide/assets/'));
    expect(store.saveAsset).not.toHaveBeenCalled();
  }));

  it('does not give up on a first download at the background-check limit', fakeAsync(() => {
    let resolved = false;
    let rejected: unknown;
    void service.downloadGuide('cattitude').then(
      () => {
        resolved = true;
      },
      (error: unknown) => {
        rejected = error;
      },
    );

    const req = http.expectOne(manifestUrl());
    tick(GUIDE_REVALIDATE_TIMEOUT_MS);
    flushMicrotasks();
    expect(rejected).toBeUndefined();
    expect(resolved).toBeFalse();
    expect(req.cancelled).toBeFalse();

    req.flush(manifest({}));
    flushMicrotasks();
    http.expectOne((req) => req.url.includes('bundle.json')).flush({ vesselSlug: 'cattitude' });
    flushMicrotasks();
    expect(resolved).toBeTrue();
  }));

  it('aborts a hung first download at 30 seconds', fakeAsync(() => {
    let rejected: unknown;
    void service.downloadGuide('cattitude').then(
      () => fail('expected the hung first download to time out'),
      (error: unknown) => {
        rejected = error;
      },
    );

    const req = http.expectOne(manifestUrl());
    tick(GUIDE_DOWNLOAD_TIMEOUT_MS - 1);
    expect(rejected).toBeUndefined();
    expect(req.cancelled).toBeFalse();

    tick(1);
    flushMicrotasks();

    expect(req.cancelled).toBeTrue();
    expect(rejected).toBeInstanceOf(TimeoutError);
  }));
});

function manifestUrl(): string {
  return `${environment.apiUrl}/api/v1/vessels/cattitude/guide/manifest`;
}

function assetEntry() {
  return {
    path: 'assets/images/logo.png',
    url: '/guide/assets/assets/images/logo.png',
    hash: 'sha256:abc',
    bytes: 3,
  };
}

function manifest(extra: {
  schemaVersion?: number | null;
  assets?: ReturnType<typeof assetEntry>[];
} = {}): GuideManifest {
  return {
    vesselId: 'v1',
    vesselSlug: 'cattitude',
    publicationVersion: 1,
    contentHash: 'abc',
    publishedAt: '2026-01-01T00:00:00Z',
    guide: { url: '/guide/bundle.json', hash: 'abc', bytes: 2 },
    assets: [],
    ...extra,
  };
}
