import {
  POLAR_BUFFER_MS,
  POLAR_SAMPLE_INTERVAL_MS,
  POLAR_STALE_AFTER_MS,
  polarWindowCovered,
} from './polar-window';

const QUARTER_MS = 15 * 60 * 1000;
const HALF_MS = 30 * 60 * 1000;

export function polarWindowFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const now = 10_000_000;
  const at = (ageMs: number) => ({ timestamp: now - ageMs });
  const covered = (samples: { timestamp: number }[], windowMs: number) =>
    polarWindowCovered(samples, windowMs, now);

  expect(POLAR_BUFFER_MS === 60 * 60 * 1000, 'the sample buffer keeps an hour');

  expect(!covered([], POLAR_BUFFER_MS), 'an empty buffer is not a full hour');
  expect(!covered([at(1_000)], POLAR_BUFFER_MS), 'one fresh sample is not a full hour');
  expect(!covered([at(60_000), at(0)], POLAR_BUFFER_MS), 'a minute of samples is not a full hour');
  expect(
    !covered([at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS - 1), at(0)], POLAR_BUFFER_MS),
    'a window one sample short of an hour stays closed',
  );
  expect(
    covered([at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS), at(0)], POLAR_BUFFER_MS),
    'samples that reach the far edge of the hour open it',
  );
  expect(
    covered([at(POLAR_BUFFER_MS), at(POLAR_SAMPLE_INTERVAL_MS)], POLAR_BUFFER_MS),
    'a sample kept at the buffer cutoff still counts',
  );
  expect(
    !covered([at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS)], POLAR_BUFFER_MS),
    'a lone sample at the far edge is not a live window',
  );
  expect(
    !covered([at(POLAR_BUFFER_MS), at(POLAR_STALE_AFTER_MS + 1)], POLAR_BUFFER_MS),
    'a full span with a stale newest sample stays closed',
  );
  expect(
    covered([at(POLAR_BUFFER_MS + 5_000), at(POLAR_BUFFER_MS), at(0)], POLAR_BUFFER_MS),
    'samples already older than the buffer are ignored',
  );

  const quarterFull = [at(QUARTER_MS - POLAR_SAMPLE_INTERVAL_MS), at(0)];
  expect(covered(quarterFull, QUARTER_MS), 'fifteen minutes of samples open the 15-minute window');
  expect(!covered(quarterFull, HALF_MS), 'fifteen minutes of samples leave the 30-minute window closed');
  expect(!covered(quarterFull, POLAR_BUFFER_MS), 'fifteen minutes of samples leave the 60-minute window closed');

  const halfFull = [at(HALF_MS - POLAR_SAMPLE_INTERVAL_MS), at(QUARTER_MS - POLAR_SAMPLE_INTERVAL_MS), at(0)];
  expect(covered(halfFull, QUARTER_MS), 'a full thirty minutes keeps the 15-minute window open');
  expect(covered(halfFull, HALF_MS), 'thirty minutes of samples open the 30-minute window');
  expect(!covered(halfFull, POLAR_BUFFER_MS), 'thirty minutes of samples leave the 60-minute window closed');
  expect(
    !covered([at(HALF_MS - POLAR_SAMPLE_INTERVAL_MS), at(0)], QUARTER_MS),
    'a sample older than fifteen minutes is not the far edge of that window',
  );

  expect(
    !covered([at(QUARTER_MS + 5_000), at(0)], QUARTER_MS),
    'a sample older than fifteen minutes does not by itself open that window',
  );
  expect(
    covered(
      [at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS), at(QUARTER_MS - POLAR_SAMPLE_INTERVAL_MS), at(0)],
      QUARTER_MS,
    ),
    'samples older than fifteen minutes do not keep that window from opening',
  );

  return failures;
}
