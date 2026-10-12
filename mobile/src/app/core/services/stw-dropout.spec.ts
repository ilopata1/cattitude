import { stwDropoutFailures } from './stw-dropout.check';

describe('STW dropout', () => {
  it('drops interspersed zeros while speed over ground shows way on', () => {
    expect(stwDropoutFailures()).toEqual([]);
  });
});
