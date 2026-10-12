import {
  STW_DROPOUT_HOLD_MS,
  STW_MIN_USEFUL_MPS,
  UNDERWAY_SOG_MPS,
  isInterspersedStwZero,
} from './stw-dropout';

export function stwDropoutFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const underway = UNDERWAY_SOG_MPS + 2;
  const sailing = 3;
  const now = 1_000_000;
  const recent = now - 1_000;

  expect(
    isInterspersedStwZero(0, { previousMps: sailing, previousAtMs: recent, sogMps: underway }, now),
    'a zero between real readings is dropped while SOG shows way on',
  );
  expect(
    isInterspersedStwZero(
      STW_MIN_USEFUL_MPS / 2,
      { previousMps: sailing, previousAtMs: recent, sogMps: underway },
      now,
    ),
    'a near-zero below the useful floor is dropped the same way',
  );
  expect(
    !isInterspersedStwZero(sailing, { previousMps: sailing, previousAtMs: recent, sogMps: underway }, now),
    'a real speed through water is kept',
  );
  expect(
    !isInterspersedStwZero(
      STW_MIN_USEFUL_MPS,
      { previousMps: sailing, previousAtMs: recent, sogMps: underway },
      now,
    ),
    'the useful floor itself is kept',
  );
  expect(
    !isInterspersedStwZero(0, { previousMps: undefined, previousAtMs: null, sogMps: underway }, now),
    'zeros are kept until a real log reading has been seen',
  );
  expect(
    !isInterspersedStwZero(0, { previousMps: 0, previousAtMs: recent, sogMps: underway }, now),
    'a log that is already at zero stays at zero',
  );
  expect(
    !isInterspersedStwZero(0, { previousMps: sailing, previousAtMs: recent, sogMps: UNDERWAY_SOG_MPS / 2 }, now),
    'a zero is kept when SOG says the boat has stopped',
  );
  expect(
    !isInterspersedStwZero(0, { previousMps: sailing, previousAtMs: recent, sogMps: undefined }, now),
    'a zero is kept when SOG has not been seen',
  );
  expect(
    !isInterspersedStwZero(
      0,
      { previousMps: sailing, previousAtMs: now - STW_DROPOUT_HOLD_MS - 1, sogMps: underway },
      now,
    ),
    'a zero that outlasts the hold is accepted',
  );
  expect(
    isInterspersedStwZero(
      0,
      { previousMps: sailing, previousAtMs: now - STW_DROPOUT_HOLD_MS, sogMps: underway },
      now,
    ),
    'a zero at the end of the hold is still dropped',
  );

  return failures;
}
