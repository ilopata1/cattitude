import { kioskFailures } from './kiosk.check';

describe('kiosk mode full screen detection', () => {
  it('hides the menu only when the browser fills the screen', () => {
    expect(kioskFailures()).toEqual([]);
  });
});
