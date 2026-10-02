import { DEFAULT_SAIL_PLAN } from '../services/sail-plan-default';
import {
  ensureMainSail,
  headsailOptions,
  sailPlansDiffer,
} from './current-sail';

export function currentSailFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };
  const plan = DEFAULT_SAIL_PLAN;
  const headsails = headsailOptions(plan);
  expect(headsails.join('|') === 'Self-tacking jib|Code 0|Gennaker|A2|S4', 'headsails are the inventory except Main');
  expect(!headsails.some((sail) => /downwind/i.test(sail)), 'advice sentences are not headsail choices');
  expect(ensureMainSail(['Code 0', 'Main', 'A2']).join('|') === 'Main|Code 0|A2', 'Main stays first');
  expect(ensureMainSail(['Code 0']).join('|') === 'Main|Code 0', 'a plan without Main gains one');

  const up = (main: 'Full' | '1 reef' | '2 reefs' | '3 reefs' | '', headsail: string) => ({ main, headsail });
  expect(!sailPlansDiffer(up('', ''), 'Main + self-tacking jib', plan), 'an empty selection does not alert');
  expect(!sailPlansDiffer(up('Full', 'Self-tacking jib'), 'Main + self-tacking jib', plan), 'full main and the named jib agree');
  expect(sailPlansDiffer(up('Full', 'Code 0'), 'Main + self-tacking jib', plan), 'a different headsail alerts');
  expect(sailPlansDiffer(up('1 reef', 'Self-tacking jib'), 'Main + self-tacking jib', plan), 'a reefed main alerts against a full main');
  expect(!sailPlansDiffer(up('1 reef', 'Self-tacking jib'), '1 reef + self-tacking jib', plan), 'one reef matches');
  expect(!sailPlansDiffer(up('2 reefs', 'Self-tacking jib'), '2–3 reefs + self-tacking jib', plan), 'the low end of a reef range matches');
  expect(!sailPlansDiffer(up('3 reefs', 'Self-tacking jib'), '2–3 reefs + self-tacking jib', plan), 'the high end of a reef range matches');
  expect(sailPlansDiffer(up('Full', 'Self-tacking jib'), '2–3 reefs + self-tacking jib', plan), 'full main is outside a reef range');
  expect(!sailPlansDiffer(up('Full', 'Code 0'), 'Code 0', plan), 'a headsail-only recommendation leaves the main alone');
  expect(!sailPlansDiffer(up('2 reefs', 'Self-tacking jib'), 'Reefed main + jib', plan), 'reefed main matches a reef and the jib');
  expect(sailPlansDiffer(up('Full', 'Self-tacking jib'), 'Reefed main + jib', plan), 'full main is not a reefed main');
  expect(
    !sailPlansDiffer(up('Full', 'A2'), 'Do not press dead downwind; gybe through hotter angles', plan),
    'dead-downwind advice is not a sail mismatch',
  );
  return failures;
}
