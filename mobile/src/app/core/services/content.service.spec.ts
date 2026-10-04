import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TimeoutError } from 'rxjs';
import { BootstrapContent } from '../models/bootstrap-content.model';
import { BootstrapSchemaError } from '../models/bootstrap-schema';
import { AppUpdateService } from './app-update.service';
import { ContentService, GuideLoadError } from './content.service';
import { EnsuredGuide, GuideSyncService } from './guide-sync.service';
import { ReaderViewService } from './reader-view.service';
import { VesselContextService } from './vessel-context.service';
import { VesselRouteService } from './vessel-route.service';

function guide(name: string): BootstrapContent {
  return {
    vesselId: 'v1',
    vesselSlug: 'cattitude',
    branding: {
      vesselName: name,
      vesselSlug: 'cattitude',
      vesselType: 'sailing_catamaran',
      model: 'Lagoon',
      charterCompany: 'Co',
      location: 'BVI',
      marina: 'Soper',
      tagline: 'Hi',
      headerLogo: null,
      heroLogo: null,
    },
    emergency: {
      mayday: { channel: '16', vesselCallsign: 'Cattitude', steps: ['MAYDAY'] },
      contacts: [],
      modalSubtitle: '',
    },
    systems: {},
    checklists: {},
    fixes: [],
    locations: {},
    manualTitles: {},
    schemaVersion: 1,
    ui: {
      homeRuleSections: [],
      doMenu: [],
      checklistMeta: {},
      systemOrder: [],
      locationLayout: [],
    },
  };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ContentService boot', () => {
  let service: ContentService;
  let guideSync: jasmine.SpyObj<GuideSyncService>;
  let toasts: { create: jasmine.Spy };
  let appUpdate: { start: jasmine.Spy; checkForUpdate: jasmine.Spy };

  beforeEach(() => {
    guideSync = jasmine.createSpyObj<GuideSyncService>('GuideSyncService', [
      'loadFromCache',
      'ensureGuide',
    ]);
    toasts = {
      create: jasmine.createSpy('create').and.resolveTo({ present: () => Promise.resolve() }),
    };
    appUpdate = {
      start: jasmine.createSpy('start'),
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.resolveTo(),
    };

    TestBed.configureTestingModule({
      providers: [
        ContentService,
        VesselContextService,
        ReaderViewService,
        VesselRouteService,
        Title,
        { provide: GuideSyncService, useValue: guideSync },
        { provide: ToastController, useValue: toasts },
        { provide: AppUpdateService, useValue: appUpdate },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    service = TestBed.inject(ContentService);
  });

  it('paints the cached guide before revalidation finishes', async () => {
    guideSync.loadFromCache.and.resolveTo({ content: guide('Cached'), contentHash: 'aaa' });
    guideSync.ensureGuide.and.returnValue(new Promise(() => undefined));

    const loaded = await service.loadBootstrapContent('cattitude');

    expect(loaded.branding.vesselName).toBe('Cached');
    expect(loaded.emergency.mayday.steps).toEqual(['MAYDAY']);
    expect(service.bootstrap.branding.vesselName).toBe('Cached');
    expect(guideSync.ensureGuide).toHaveBeenCalledOnceWith('cattitude');
  });

  it('swaps in a newer publication and says the guide updated', async () => {
    let resolveNetwork: (value: EnsuredGuide) => void = () => undefined;
    guideSync.loadFromCache.and.resolveTo({ content: guide('Cached'), contentHash: 'aaa' });
    guideSync.ensureGuide.and.returnValue(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }),
    );

    await service.loadBootstrapContent('cattitude');
    resolveNetwork({ content: guide('Fresh'), contentHash: 'bbb', updated: true });
    await flushPromises();

    expect(service.bootstrap.branding.vesselName).toBe('Fresh');
    expect(toasts.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'Guide updated',
        htmlAttributes: jasmine.objectContaining({ 'aria-live': 'polite', role: 'status' }),
      }),
    );
  });

  it('keeps the cached guide when the publication has not changed', async () => {
    let resolveNetwork: (value: EnsuredGuide) => void = () => undefined;
    guideSync.loadFromCache.and.resolveTo({ content: guide('Cached'), contentHash: 'aaa' });
    guideSync.ensureGuide.and.returnValue(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }),
    );

    await service.loadBootstrapContent('cattitude');
    resolveNetwork({ content: guide('Fresh'), contentHash: 'aaa', updated: false });
    await flushPromises();

    expect(service.bootstrap.branding.vesselName).toBe('Cached');
    expect(toasts.create).not.toHaveBeenCalled();
  });

  it('keeps the cached guide when revalidation times out', async () => {
    guideSync.loadFromCache.and.resolveTo({ content: guide('Cached'), contentHash: 'aaa' });
    guideSync.ensureGuide.and.returnValue(Promise.reject(new TimeoutError()));

    const loaded = await service.loadBootstrapContent('cattitude');
    await flushPromises();

    expect(loaded.branding.vesselName).toBe('Cached');
    expect(service.bootstrap.branding.vesselName).toBe('Cached');
    expect(toasts.create).not.toHaveBeenCalled();
  });

  it('waits for the network only when nothing is stored', async () => {
    let resolveNetwork: (value: EnsuredGuide) => void = () => undefined;
    guideSync.loadFromCache.and.resolveTo(null);
    guideSync.ensureGuide.and.returnValue(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }),
    );

    let settled = false;
    const pending = service.loadBootstrapContent('cattitude').then((value) => {
      settled = true;
      return value;
    });
    await flushPromises();
    expect(settled).toBeFalse();

    resolveNetwork({ content: guide('Fresh'), contentHash: 'bbb', updated: true });
    const loaded = await pending;
    expect(loaded.branding.vesselName).toBe('Fresh');
    expect(toasts.create).not.toHaveBeenCalled();
  });

  it('reports a first download that times out as offline', async () => {
    guideSync.loadFromCache.and.resolveTo(null);
    guideSync.ensureGuide.and.returnValue(Promise.reject(new TimeoutError()));

    try {
      await service.loadBootstrapContent('cattitude');
      fail('expected the first download to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(GuideLoadError);
      expect((error as GuideLoadError).failure).toBe('offline');
    }
  });

  it('keeps the cached guide when the published schema does not match this app', async () => {
    const fresh = guide('Fresh');
    fresh.schemaVersion = 2;
    let resolveNetwork: (value: EnsuredGuide) => void = () => undefined;
    guideSync.loadFromCache.and.resolveTo({ content: guide('Cached'), contentHash: 'aaa' });
    guideSync.ensureGuide.and.returnValue(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }),
    );

    await service.loadBootstrapContent('cattitude');
    resolveNetwork({ content: fresh, contentHash: 'bbb', updated: true });
    await flushPromises();

    expect(service.bootstrap.branding.vesselName).toBe('Cached');
    expect(toasts.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        color: 'warning',
        message: jasmine.stringMatching(/schema 2/),
        htmlAttributes: jasmine.objectContaining({ 'aria-live': 'assertive', role: 'alert' }),
      }),
    );
    expect(appUpdate.checkForUpdate).toHaveBeenCalled();
  });

  it('does not paint a cached guide this app cannot read', async () => {
    const stale = guide('Old');
    stale.schemaVersion = 2;
    guideSync.loadFromCache.and.resolveTo({ content: stale, contentHash: 'old' });
    guideSync.ensureGuide.and.returnValue(Promise.reject(new BootstrapSchemaError(2)));

    try {
      await service.loadBootstrapContent('cattitude');
      fail('expected a schema mismatch');
    } catch (error) {
      expect(error).toBeInstanceOf(GuideLoadError);
      expect((error as GuideLoadError).failure).toBe('schema');
      expect((error as GuideLoadError).message).toContain('schema 2');
    }

    expect(service.loaded).toBeFalse();
    expect(appUpdate.start).toHaveBeenCalled();
    expect(appUpdate.checkForUpdate).toHaveBeenCalled();
  });

  it('replaces an unreadable cache when the network guide matches this app', async () => {
    const stale = guide('Old');
    stale.schemaVersion = 2;
    let resolveNetwork: (value: EnsuredGuide) => void = () => undefined;
    guideSync.loadFromCache.and.resolveTo({ content: stale, contentHash: 'old' });
    guideSync.ensureGuide.and.returnValue(
      new Promise((resolve) => {
        resolveNetwork = resolve;
      }),
    );

    let settled = false;
    const pending = service.loadBootstrapContent('cattitude').then((value) => {
      settled = true;
      return value;
    });
    await flushPromises();
    expect(settled).toBeFalse();
    expect(service.loaded).toBeFalse();

    resolveNetwork({ content: guide('Fresh'), contentHash: 'new', updated: true });
    const loaded = await pending;
    expect(loaded.branding.vesselName).toBe('Fresh');
    expect(toasts.create).not.toHaveBeenCalled();
  });

  it('hides crew home rules and contacts in the guest view', async () => {
    const loaded = guide('Rules');
    loaded.ui.homeRuleSections = [
      {
        title: 'Never',
        tone: 'danger',
        rules: [{ icon: '🛞', text: 'Stay at the helm', tone: 'danger', audience: 'crew' }],
      },
      {
        title: 'Always',
        tone: 'caution',
        rules: [
          { icon: '🛟', text: 'Wear a life jacket', tone: 'caution' },
          { icon: '📻', text: 'Monitor the radio', tone: 'caution', audience: 'crew' },
        ],
      },
    ];
    loaded.emergency.contacts = [
      { label: 'CROSS', value: 'VHF 16', action: 'vhf' },
      { label: 'Yard', value: '555', action: 'call', audience: 'crew' },
    ];
    guideSync.loadFromCache.and.resolveTo({ content: loaded, contentHash: 'rules' });
    guideSync.ensureGuide.and.returnValue(new Promise(() => undefined));

    await service.loadBootstrapContent('cattitude');

    const guest = service.visibleHomeRuleSections('guest');
    expect(guest.map((section) => section.title)).toEqual(['Always']);
    expect(guest[0].rules.map((rule) => rule.text)).toEqual(['Wear a life jacket']);
    expect(service.visibleHomeRuleSections('crew').map((section) => section.title)).toEqual([
      'Never',
      'Always',
    ]);
    expect(service.visibleEmergencyContacts('guest').map((contact) => contact.label)).toEqual(['CROSS']);
    expect(service.visibleEmergencyContacts('crew').map((contact) => contact.label)).toEqual([
      'CROSS',
      'Yard',
    ]);
  });
});
