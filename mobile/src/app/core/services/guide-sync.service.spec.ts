import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BootstrapSchemaError } from '../models/bootstrap-schema';
import {
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
      'resolveAssetUrl',
    ]);
    store.getStoredGuide.and.resolveTo(null);
    store.saveGuide.and.resolveTo();

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
});

function manifest(extra: { schemaVersion?: number | null }): Record<string, unknown> {
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
