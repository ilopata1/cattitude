/**
 * Kiosk mode: while the browser fills the screen, the app hides its menu
 * (the bottom tab bar on phones and tablets, the side rail on desktop).
 *
 * Browsers report full screen in different ways, so this reads every signal
 * the page can see and treats any one of them as full screen:
 * - the Fullscreen API (our own Full screen button, and iPad Safari)
 * - `display-mode: fullscreen`, which Chrome, Edge and Firefox match for F11
 * - on a desktop with a mouse, a window exactly the size of the screen, for
 *   browsers that report neither (Safari's green-button full screen)
 *
 * The size check never runs on touch devices or home-screen apps, because an
 * iPhone or iPad home-screen app is always exactly screen-sized.
 */
export interface FullscreenSignals {
  /** `document.fullscreenElement` (or the webkit prefix) is set. */
  apiFullscreen: boolean;
  /** `matchMedia('(display-mode: fullscreen)')` matches. */
  displayModeFullscreen: boolean;
  /** Launched from the home screen (`display-mode: standalone` or `navigator.standalone`). */
  standalone: boolean;
  /** `(hover: hover) and (pointer: fine)`: a mouse or trackpad. */
  finePointer: boolean;
  innerWidth: number;
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
}

/** CSS pixels of slack for rounding between the window and the screen. */
const SIZE_SLACK = 2;

export function isBrowserFullscreen(signals: FullscreenSignals): boolean {
  if (signals.apiFullscreen || signals.displayModeFullscreen) {
    return true;
  }
  if (signals.standalone || !signals.finePointer) {
    return false;
  }
  if (signals.screenWidth <= 0 || signals.screenHeight <= 0) {
    return false;
  }
  // Exact match, not "at least": browser zoom scales the window size but not
  // the screen size, so a zoomed-out maximised window would otherwise count.
  return Math.abs(signals.innerWidth - signals.screenWidth) <= SIZE_SLACK
    && Math.abs(signals.innerHeight - signals.screenHeight) <= SIZE_SLACK;
}

/**
 * What the floating control does in kiosk mode. Full screen we entered through
 * the Fullscreen API can be left from the page, which matters on an iPad with
 * no Escape key. F11 and the green button cannot be undone from the page, so
 * there the control only brings the menu back.
 */
export type KioskControl = 'exit' | 'toggle-menu' | null;

export function kioskControl(kiosk: boolean, apiFullscreen: boolean): KioskControl {
  if (!kiosk) return null;
  return apiFullscreen ? 'exit' : 'toggle-menu';
}
