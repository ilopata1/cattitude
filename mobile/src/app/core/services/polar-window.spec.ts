import { polarWindowFailures } from './polar-window.check';

describe('Polar window coverage', () => {
  it('waits until live samples span the whole window', () => {
    expect(polarWindowFailures()).toEqual([]);
  });
});
