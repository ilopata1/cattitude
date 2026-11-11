import { dutyRotaFailures } from './duty-rota.check';

describe('duty rota', () => {
  it('rotates crew from the trip start', () => {
    expect(dutyRotaFailures()).toEqual([]);
  });
});
