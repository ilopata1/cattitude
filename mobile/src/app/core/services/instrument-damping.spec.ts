import { instrumentDampingFailures } from './instrument-damping.check';

describe('Instrument damping', () => {
  it('follows the time constant and snaps only heading, course, and speed', () => {
    expect(instrumentDampingFailures()).toEqual([]);
  });
});
