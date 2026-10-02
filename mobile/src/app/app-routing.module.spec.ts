import { TestBed } from '@angular/core/testing';
import { RedirectFunction, Route } from '@angular/router';
import { routes } from './app-routing.module';
import { VesselResolverService } from './core/services/vessel-resolver.service';

describe('legacy vessel redirects', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: VesselResolverService,
          useValue: { defaultSlug: () => 'supernova' },
        },
      ],
    });
  });

  it('sends every legacy redirect through the host default', () => {
    const redirects = functionalRedirects(routes);
    expect(redirects.length).toBeGreaterThan(0);

    for (const redirectTo of redirects) {
      const target = TestBed.runInInjectionContext(() =>
        redirectTo({
          params: { stageId: 'stage', lessonId: 'lesson', key: 'engine' },
          queryParams: {},
          fragment: null,
          data: {},
          url: [],
          outlet: 'primary',
          routeConfig: null,
          title: undefined,
        }),
      );
      expect(String(target)).toMatch(/^\/v\/supernova\//);
    }
  });
});

function functionalRedirects(routeList: Route[]): RedirectFunction[] {
  const found: RedirectFunction[] = [];
  for (const route of routeList) {
    if (typeof route.redirectTo === 'function') {
      found.push(route.redirectTo);
    }
    if (route.children) {
      found.push(...functionalRedirects(route.children));
    }
  }
  return found;
}
