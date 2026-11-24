import { isInterspersedStwZero } from '../services/stw-dropout';
import { WAVE_BRIDGE_GAP_S, afterLastLongGap } from './wave-estimator';

const trace = (times: number[]) => ({ t: times, v: times.map(() => 0) });

describe('wave estimate gaps', () => {
  it('keeps a stream with only short pauses whole', () => {
    const times = [0, 1, 2, 2 + WAVE_BRIDGE_GAP_S, 3 + WAVE_BRIDGE_GAP_S];
    const series = { pitch: trace(times), roll: trace(times) };
    expect(afterLastLongGap(series).pitch.t.length).toBe(5);
  });

  it('analyses only the stretch after a phone slept', () => {
    const times = [0, 1, 2, 300, 301, 302];
    const series = { pitch: trace(times), roll: trace(times), stw: trace([0, 150, 300, 302]) };
    const trimmed = afterLastLongGap(series);
    expect(trimmed.pitch.t).toEqual([300, 301, 302]);
    expect(trimmed.roll.t).toEqual([300, 301, 302]);
    expect(trimmed.stw?.t).toEqual([300, 302]);
  });

  it('drops an odd zero from the log while the boat is moving', () => {
    const context = { previousMps: 3, previousAtMs: 1_000, sogMps: 3 };
    expect(isInterspersedStwZero(0, context, 3_000)).toBeTrue();
    expect(isInterspersedStwZero(0, { ...context, sogMps: 0 }, 3_000)).toBeFalse();
  });
});
