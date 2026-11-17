import { EMPTY_SAIL_ESSENTIALS, EMPTY_WIND_STEER } from '../models/instrument-map.model';
import {
  HISTORY_CAPACITY,
  applyHistorySample,
  historySample,
  pushHistorySample,
} from './instrument-history';

export function instrumentHistoryFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const quiet = historySample({ essentials: EMPTY_SAIL_ESSENTIALS, wind: EMPTY_WIND_STEER });
  expect(Object.keys(quiet).length === 0, 'the empty live snapshot records nothing');

  const stale = historySample({
    essentials: { ...EMPTY_SAIL_ESSENTIALS, depthM: 4, speedKn: 6, stale: true },
    wind: EMPTY_WIND_STEER,
  });
  expect(stale.depth == null && stale.speed == null, 'a stale essentials reading is not sampled');

  const live = historySample({
    essentials: {
      depthM: 4.2,
      speedKn: 6.1,
      speedSource: 'stw',
      sogKnots: 6.4,
      stale: false,
    },
    wind: { ...EMPTY_WIND_STEER, aws: 12, awsFresh: true, heading: 0, headingFresh: false },
  });
  expect(live.depth === 4.2 && live.speed === 6.1 && live.sog === 6.4, 'fresh depth, speed, and sog are kept');
  expect(live.aws === 12, 'fresh apparent wind speed is kept');
  expect(live.heading == null, 'an unfresh heading of 0 is not a north sample');

  const north = historySample({
    essentials: EMPTY_SAIL_ESSENTIALS,
    wind: { ...EMPTY_WIND_STEER, heading: 0, headingFresh: true },
  });
  expect(north.heading === 0, 'a fresh heading of 0 is north and is kept');

  let samples: readonly number[] = [];
  for (let i = 0; i < HISTORY_CAPACITY + 1; i += 1) {
    samples = pushHistorySample(samples, i);
  }
  expect(samples.length === HISTORY_CAPACITY, 'the ring holds ten minutes of samples');
  expect(samples[0] === 1 && samples[samples.length - 1] === HISTORY_CAPACITY, 'the ring drops the oldest sample');
  expect(pushHistorySample(samples, Number.NaN) === samples, 'a non-finite sample does not change the ring');

  const series = applyHistorySample({}, { depth: 3, heading: 90 });
  const again = applyHistorySample(series, { depth: 4 });
  expect(series.depth?.length === 1 && series.heading?.[0] === 90, 'each role keeps its own trace');
  expect(again.depth?.[1] === 4 && again.heading?.[0] === 90, 'a later sample appends without clearing other roles');

  return failures;
}
