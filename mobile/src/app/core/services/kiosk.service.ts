import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { FullscreenSignals, isBrowserFullscreen, kioskControl } from '../kiosk/kiosk';

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

/**
 * Hides the menu while the browser is full screen. Sets `kiosk` on <html>
 * (and `kiosk-reveal` while the user has asked for the menu back); the
 * styles that hide the tab bar and side rail live in global.scss.
 */
@Injectable({ providedIn: 'root' })
export class KioskService {
  private readonly zone = inject(NgZone);
  private readonly kioskSignal = signal(false);
  private readonly apiSignal = signal(false);
  private readonly revealSignal = signal(false);

  /** The browser fills the screen, so the menu is hidden. */
  readonly kiosk = this.kioskSignal.asReadonly();
  /** The menu is showing again although the screen is still full. */
  readonly menuRevealed = this.revealSignal.asReadonly();
  /** What the floating control offers: leave full screen, or show the menu. */
  readonly control = computed(() => kioskControl(this.kioskSignal(), this.apiSignal()));

  /** This browser lets the page go full screen. False on iPhone. */
  readonly canRequest: boolean = (() => {
    const doc = document as WebkitDocument;
    return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  })();

  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    const update = () => this.zone.run(() => this.refresh());
    const media = ['(display-mode: fullscreen)', '(display-mode: standalone)']
      .map((query) => window.matchMedia?.(query))
      .filter((list): list is MediaQueryList => !!list);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    window.addEventListener('resize', update);
    media.forEach((list) => list.addEventListener?.('change', update));
    // A root service lives as long as the app, so the listeners are never removed.
    this.refresh();
  }

  async enter(): Promise<void> {
    const root = document.documentElement as WebkitElement;
    try {
      if (root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else {
        await root.webkitRequestFullscreen?.();
      }
    } catch {
      /* the browser can refuse, for example without a user gesture */
    }
    this.refresh();
  }

  async exit(): Promise<void> {
    const doc = document as WebkitDocument;
    try {
      if (doc.fullscreenElement && doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitFullscreenElement) {
        await doc.webkitExitFullscreen?.();
      }
    } catch {
      /* already left */
    }
    this.refresh();
  }

  toggleMenu(): void {
    this.revealSignal.update((shown) => !shown);
    this.applyClasses();
  }

  private refresh(): void {
    const signals = readSignals();
    const kiosk = isBrowserFullscreen(signals);
    if (!kiosk) {
      this.revealSignal.set(false);
    }
    this.apiSignal.set(signals.apiFullscreen);
    this.kioskSignal.set(kiosk);
    this.applyClasses();
  }

  private applyClasses(): void {
    const root = document.documentElement.classList;
    root.toggle('kiosk', this.kioskSignal());
    root.toggle('kiosk-reveal', this.kioskSignal() && this.revealSignal());
  }
}

function readSignals(): FullscreenSignals {
  const doc = document as WebkitDocument;
  const matches = (query: string) => !!window.matchMedia?.(query).matches;
  return {
    apiFullscreen: !!(doc.fullscreenElement || doc.webkitFullscreenElement),
    displayModeFullscreen: matches('(display-mode: fullscreen)'),
    standalone: matches('(display-mode: standalone)')
      || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    finePointer: matches('(hover: hover) and (pointer: fine)'),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
  };
}
