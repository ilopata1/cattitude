import { environment } from '../../../environments/environment';
import { VesselResolverService } from './vessel-resolver.service';

describe('VesselResolverService', () => {
  const resolver = new VesselResolverService();
  const supernovaHost = 'app.sailsupernova.com';

  it('maps the production host to supernova when the path has no vessel', () => {
    expect(environment.hostDefaultSlugs[supernovaHost]).toBe('supernova');
    expect(resolver.resolveSlugFromLocation('/', supernovaHost)).toBe('supernova');
    expect(resolver.resolveSlugFromLocation('/tabs/home', supernovaHost)).toBe('supernova');
    expect(resolver.defaultSlug(supernovaHost)).toBe('supernova');
  });

  it('keeps an explicit slug on a host that defaults to another vessel', () => {
    expect(resolver.resolveSlugFromLocation('/v/cattitude', supernovaHost)).toBe('cattitude');
    expect(resolver.resolveSlugFromLocation('/v/cattitude/tabs/home', supernovaHost)).toBe(
      'cattitude',
    );
    expect(resolver.resolveSlugFromLocation('/v/supernova/tabs/know', 'localhost')).toBe(
      'supernova',
    );
  });

  it('falls back when the hostname is not mapped', () => {
    expect(resolver.resolveSlugFromLocation('/', 'localhost')).toBe(environment.defaultVesselSlug);
    expect(resolver.defaultSlug('localhost')).toBe('cattitude');
  });

  it('decodes the slug from the path', () => {
    expect(resolver.resolveSlugFromLocation('/v/sister%20test/tabs/home', 'localhost')).toBe(
      'sister test',
    );
  });
});
