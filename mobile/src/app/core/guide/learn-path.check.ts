import { buildLearnPath, resolveLearnPath } from './learn-path';

export function learnPathFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };
  const line = (stages: ReturnType<typeof buildLearnPath>) =>
    stages.map((stage) => `${stage.id}:${stage.lessons.map((lesson) => lesson.id).join(',')}`).join('|');

  const checks = ['safety-brief', 'pd', 'anch', 'lu', 'ec'];
  expect(
    line(
      buildLearnPath(
        [
          'overview',
          'safety',
          'seamanship',
          'sails',
          'engines',
          'controls',
          'electrical',
          'batteries',
          'water',
          'heads',
          'galley',
          'ac',
          'nav',
          'dinghy',
        ],
        checks,
      ),
    ) === 'walk:overview|safety:safety-brief|living:heads,water,power,galley,ac|underway:engines,sails,nav|ashore:dinghy',
    'supernova path',
  );
  expect(
    line(
      buildLearnPath(
        [
          'overview',
          'safety',
          'sails',
          'engines',
          'electrical',
          'batteries',
          'water',
          'heads',
          'galley',
          'ac',
          'nav',
          'anchoring',
          'dinghy',
        ],
        checks,
      ),
    ) ===
      'walk:overview|safety:safety-brief|living:heads,water,power,galley,ac|underway:engines,sails,nav,anchoring|ashore:dinghy',
    'cattitude path',
  );
  expect(
    line(buildLearnPath(['engines', 'controls', 'electrical', 'batteries', 'water', 'heads', 'nav'], [])) ===
      'living:heads,water,power|underway:engines,nav',
    'sister-test path',
  );
  const stored = [{ id: 'walk', title: 'Walk-around', lessons: [{ id: 'overview', kind: 'chapter' as const }] }];
  expect(resolveLearnPath(stored, ['engines'], []).length === 1, 'a stored path is used');
  expect(
    resolveLearnPath(undefined, ['engines', 'nav'], []).map((stage) => stage.id).join(',') === 'underway',
    'a bundle without learnPath is derived',
  );
  return failures;
}
