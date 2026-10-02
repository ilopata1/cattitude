import { Injectable, signal } from '@angular/core';

/** Keep in sync with the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'cattitude.theme';

export type ThemePreference = 'system' | 'light' | 'dark' | 'night';
export type ResolvedTheme = 'light' | 'dark' | 'night';

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark', 'night'];

/**
 * Light, dark, or a red helm night. "System" follows the OS light/dark
 * setting and does not turn on the red helm palette.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferenceSignal = signal<ThemePreference>(this.read());
  private readonly systemDarkSignal = signal(this.systemPrefersDark());
  readonly preference = this.preferenceSignal.asReadonly();

  private media: MediaQueryList | null = null;
  private readonly onSystemChange = (event: MediaQueryListEvent): void => {
    this.systemDarkSignal.set(event.matches);
    if (this.preferenceSignal() === 'system') {
      this.apply();
    }
  };

  constructor() {
    this.media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
    this.systemDarkSignal.set(!!this.media?.matches);
    this.media?.addEventListener?.('change', this.onSystemChange);
    this.apply();
  }

  resolved(): ResolvedTheme {
    const preference = this.preferenceSignal();
    if (preference === 'system') {
      return this.systemDarkSignal() ? 'dark' : 'light';
    }
    return preference;
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* private mode and full storage can refuse the write */
    }
    this.apply();
  }

  private apply(): void {
    const theme = this.resolved();
    const root = document.documentElement;
    root.dataset['theme'] = theme;
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    const scheme = theme === 'light' ? 'light' : 'dark';
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', scheme);
    const bar = theme === 'night' ? '#240808' : '#0D2137';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
  }

  private systemPrefersDark(): boolean {
    return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }

  private read(): ThemePreference {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (PREFERENCES as readonly string[]).includes(stored)) {
        return stored as ThemePreference;
      }
    } catch {
      /* storage can throw in private mode */
    }
    return 'system';
  }
}
