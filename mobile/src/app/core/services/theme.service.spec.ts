import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let matchesDark = false;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    matchesDark = false;
    spyOn(window, 'matchMedia').and.callFake((query: string) => ({
      matches: matchesDark && query.includes('dark'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('follows the OS when nothing is stored', () => {
    matchesDark = true;
    const theme = TestBed.inject(ThemeService);

    expect(theme.preference()).toBe('system');
    expect(theme.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('stores night and shifts the document to the red helm theme', () => {
    const theme = TestBed.inject(ThemeService);
    theme.setPreference('night');

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(theme.resolved()).toBe('night');
    expect(document.documentElement.dataset['theme']).toBe('night');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('keeps an explicit light choice when the OS is dark', () => {
    matchesDark = true;
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    const theme = TestBed.inject(ThemeService);

    expect(theme.preference()).toBe('light');
    expect(theme.resolved()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
