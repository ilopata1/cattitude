import { FullscreenSignals, isBrowserFullscreen, kioskControl } from './kiosk';

const desktopWindow: FullscreenSignals = {
  apiFullscreen: false,
  displayModeFullscreen: false,
  standalone: false,
  finePointer: true,
  innerWidth: 1920,
  innerHeight: 960,
  screenWidth: 1920,
  screenHeight: 1080,
};

export function kioskFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };
  const full = (overrides: Partial<FullscreenSignals>) => isBrowserFullscreen({ ...desktopWindow, ...overrides });

  expect(!full({}), 'a normal desktop window is not full screen');
  expect(full({ apiFullscreen: true }), 'the Fullscreen API counts');
  expect(full({ displayModeFullscreen: true }), 'display-mode fullscreen (F11) counts');
  expect(full({ innerHeight: 1080 }), 'a screen-sized desktop window counts');
  expect(full({ innerWidth: 1919.5, innerHeight: 1081 }), 'rounding slack is allowed');
  expect(!full({ innerWidth: 2400, innerHeight: 1200 }), 'a zoomed-out window larger than the screen does not count');
  expect(!full({ finePointer: false, innerHeight: 1080 }), 'a screen-sized touch device does not count');
  expect(
    !full({ standalone: true, innerHeight: 1080 }),
    'a screen-sized home-screen app does not count',
  );
  expect(
    full({ standalone: true, finePointer: false, apiFullscreen: true }),
    'the Fullscreen API still counts on an iPad',
  );
  expect(!full({ screenWidth: 0, screenHeight: 0, innerWidth: 0, innerHeight: 0 }), 'an unknown screen size does not count');

  expect(kioskControl(false, false) === null, 'no control outside kiosk mode');
  expect(kioskControl(true, true) === 'exit', 'API full screen offers exit');
  expect(kioskControl(true, false) === 'toggle-menu', 'F11 full screen offers the menu');

  return failures;
}
