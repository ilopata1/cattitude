import { PolarWindowMinutes } from '../models/polar.model';
import { decideSailWindows, SailWindowSnapshot } from './sail-watch';

function snap(
  minutes: PolarWindowMinutes,
  covered: boolean,
  sailsDiffer: boolean,
  recommendedKey = 'reef 1 + jib',
): SailWindowSnapshot {
  return { minutes, covered, sailsDiffer, recommendedKey };
}

export function sailWatchFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const memory = new Map<PolarWindowMinutes, string | null>([
    [15, 'reef 1 + jib'],
    [30, 'full main + jib'],
  ]);
  const held = decideSailWindows(
    [
      snap(15, false, true),
      snap(30, true, false, 'full main + jib'),
      snap(60, true, true, 'reef 2 + jib'),
    ],
    memory,
  );

  expect(!held[0].notify && held[0].remembered === 'reef 1 + jib', 'an uncovered window keeps its memory and stays quiet');
  expect(!held[1].notify && held[1].remembered === null, 'a matching window clears its memory without notifying');
  expect(held[2].notify && held[2].remembered === 'reef 2 + jib', 'a newly covered mismatch notifies on its own');

  const samePlan = decideSailWindows(
    [
      snap(15, true, true, 'reef 1 + jib'),
      snap(30, true, true, 'reef 1 + jib'),
      snap(60, false, true, 'reef 1 + jib'),
    ],
    new Map(),
  );
  expect(samePlan[0].notify && samePlan[1].notify, 'the same recommendation notifies again for each covered window');
  expect(!samePlan[2].notify && samePlan[2].remembered === null, 'the hour stays quiet until it is covered');

  const repeat = decideSailWindows(
    [snap(15, true, true, 'reef 1 + jib')],
    new Map([[15, 'reef 1 + jib']]),
  );
  expect(!repeat[0].notify, 'a window does not repeat the recommendation it already sent');

  const changed = decideSailWindows(
    [snap(30, true, true, 'reef 2 + jib')],
    new Map([[30, 'reef 1 + jib']]),
  );
  expect(changed[0].notify && changed[0].remembered === 'reef 2 + jib', 'a changed recommendation notifies again');

  const matchDoesNotSilence = decideSailWindows(
    [
      snap(15, true, false, 'full main + jib'),
      snap(30, true, true, 'reef 1 + jib'),
    ],
    new Map([[15, 'reef 1 + jib'], [30, null]]),
  );
  expect(!matchDoesNotSilence[0].notify && matchDoesNotSilence[1].notify, 'a 15-minute match still lets the 30-minute mismatch notify');

  return failures;
}
