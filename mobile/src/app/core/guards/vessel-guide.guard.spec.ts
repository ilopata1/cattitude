import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { vesselGuideGuard } from './vessel-guide.guard';
import { BootstrapContent } from '../models/bootstrap-content.model';
import { ContentService } from '../services/content.service';
import { GuideLoadService } from '../services/guide-load.service';
import { InstrumentMapService } from '../services/instrument-map.service';
import { SailPlanService } from '../services/sail-plan.service';
import { VesselContextService } from '../services/vessel-context.service';
import { VesselResolverService } from '../services/vessel-resolver.service';

describe('vesselGuideGuard', () => {
  let loaded = false;
  let bootstrapSlug = '';
  let hasError = false;
  let errorSlug: string | null = null;
  let content: ContentService;
  let guideLoad: GuideLoadService;
  let vesselContext: jasmine.SpyObj<VesselContextService>;
  let sailPlans: jasmine.SpyObj<SailPlanService>;
  let instrumentMaps: jasmine.SpyObj<InstrumentMapService>;
  let router: jasmine.SpyObj<Router>;

  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    loaded = false;
    bootstrapSlug = '';
    hasError = false;
    errorSlug = null;

    content = {
      loadBootstrapContent: jasmine.createSpy('loadBootstrapContent'),
      get loaded() {
        return loaded;
      },
      get bootstrap() {
        return { vesselSlug: bootstrapSlug } as BootstrapContent;
      },
    } as unknown as ContentService;
    guideLoad = {
      clearError: jasmine.createSpy('clearError'),
      setError: jasmine.createSpy('setError'),
      get hasError() {
        return hasError;
      },
      get slug() {
        return errorSlug;
      },
    } as unknown as GuideLoadService;
    vesselContext = jasmine.createSpyObj<VesselContextService>('VesselContextService', [
      'setVesselSlug',
    ]);
    sailPlans = jasmine.createSpyObj<SailPlanService>('SailPlanService', ['ensureLoaded']);
    sailPlans.ensureLoaded.and.resolveTo();
    instrumentMaps = jasmine.createSpyObj<InstrumentMapService>('InstrumentMapService', [
      'ensureLoaded',
    ]);
    instrumentMaps.ensureLoaded.and.resolveTo();
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue({} as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: ContentService, useValue: content },
        { provide: GuideLoadService, useValue: guideLoad },
        { provide: VesselContextService, useValue: vesselContext },
        { provide: SailPlanService, useValue: sailPlans },
        { provide: InstrumentMapService, useValue: instrumentMaps },
        {
          provide: VesselResolverService,
          useValue: { defaultSlug: () => 'cattitude' },
        },
        { provide: Router, useValue: router },
      ],
    });
  });

  function activate(slug: string | null) {
    const route = {
      paramMap: { get: (key: string) => (key === 'vesselSlug' ? slug : null) },
    } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => vesselGuideGuard(route, state));
  }

  it('loads the route slug and opens the tabs', async () => {
    (content.loadBootstrapContent as jasmine.Spy).and.resolveTo({} as BootstrapContent);

    await expectAsync(activate('supernova')).toBeResolvedTo(true);

    expect(vesselContext.setVesselSlug).toHaveBeenCalledOnceWith('supernova');
    expect(content.loadBootstrapContent).toHaveBeenCalledOnceWith('supernova');
    expect(guideLoad.clearError).toHaveBeenCalled();
    expect(sailPlans.ensureLoaded).toHaveBeenCalled();
    expect(instrumentMaps.ensureLoaded).toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('records the failure and redirects to the vessel error route', async () => {
    const failure = new Error('offline');
    const tree = { redirected: true } as unknown as UrlTree;
    (content.loadBootstrapContent as jasmine.Spy).and.rejectWith(failure);
    router.createUrlTree.and.returnValue(tree);

    await expectAsync(activate('supernova')).toBeResolvedTo(tree);

    expect(guideLoad.setError).toHaveBeenCalledOnceWith('supernova', failure);
    expect(guideLoad.clearError).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/v', 'supernova', 'error']);
  });

  it('does not load again when this slug is already in memory', async () => {
    loaded = true;
    bootstrapSlug = 'supernova';

    await expectAsync(activate('supernova')).toBeResolvedTo(true);

    expect(content.loadBootstrapContent).not.toHaveBeenCalled();
    expect(vesselContext.setVesselSlug).toHaveBeenCalledOnceWith('supernova');
  });

  it('redirects when this slug already failed and the guide is cached', async () => {
    loaded = true;
    bootstrapSlug = 'supernova';
    hasError = true;
    errorSlug = 'supernova';
    const tree = { redirected: true } as unknown as UrlTree;
    router.createUrlTree.and.returnValue(tree);

    await expectAsync(activate('supernova')).toBeResolvedTo(tree);

    expect(content.loadBootstrapContent).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/v', 'supernova', 'error']);
  });

  it('sends a missing slug to the default vessel error route', async () => {
    const tree = { redirected: true } as unknown as UrlTree;
    router.createUrlTree.and.returnValue(tree);

    await expectAsync(activate(null)).toBeResolvedTo(tree);

    expect(content.loadBootstrapContent).not.toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/v', 'cattitude', 'error']);
  });
});
