import {
  POLAR_BUFFER_MS,
  POLAR_SAMPLE_INTERVAL_MS,
  POLAR_STALE_AFTER_MS,
  polarWindowCovered,
} from './polar-window';

export function polarWindowFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const now = 10_000_000;
  const at = (ageMs: number) => ({ timestamp: now - ageMs });
  const covered = (samples: { timestamp: number }[]) =>
    polarWindowCovered(samples, POLAR_BUFFER_MS, now);

  expect(!covered([]), 'an empty buffer is not a 15-minute window');
  expect(!covered([at(1_000)]), 'one fresh sample is not a 15-minute window');
  expect(!covered([at(60_000), at(0)]), 'a minute of samples is not a 15-minute window');
  expect(
    !covered([at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS - 1), at(0)]),
    'a window one sample short of 15 minutes stays closed',
  );
  expect(
    covered([at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS), at(0)]),
    'samples that reach the far edge of the buffer open the window',
  );
  expect(
    covered([at(POLAR_BUFFER_MS), at(POLAR_SAMPLE_INTERVAL_MS)]),
    'a sample kept at the buffer cutoff still counts',
  );
  expect(
    !covered([at(POLAR_BUFFER_MS - POLAR_SAMPLE_INTERVAL_MS)]),
    'a lone sample at the far edge is not a live window',
  );
  expect(
    !covered([at(POLAR_BUFFER_MS), at(POLAR_STALE_AFTER_MS + 1)]),
    'a full span with a stale newest sample stays closed',
  );
  expect(
    covered([at(POLAR_BUFFER_MS + 5_000), at(POLAR_BUFFER_MS), at(0)]),
    'samples already older than the buffer are ignored',
  );

  return failures;
}
