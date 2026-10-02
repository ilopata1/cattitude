import { buildAskSuggestions, resolveAskSuggestions } from './ask-suggestions';

export function askSuggestionFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const untitled = buildAskSuggestions({
    engines: {},
    electrical: {},
    water: {},
    sails: {},
  });
  expect(
    untitled.join('|') ===
      'How do I start the engine?|Where is the electrical panel?|How does the water system work?',
    'untitled chapters use generic names',
  );
  const joined = untitled.join(' ').toLowerCase();
  expect(!joined.includes('port engine'), 'suggestions do not assume a port engine');
  expect(!joined.includes('watermaker'), 'suggestions do not assume a watermaker');
  expect(!joined.includes('outremer'), 'suggestions do not name a hull');

  const titled = buildAskSuggestions({
    engines: { title: 'Engines' },
    electrical: { title: 'Electrical Panel' },
    water: { title: 'Water & Watermaker' },
  });
  expect(
    titled.join('|') ===
      'How do I start the engines?|Where is the electrical panel?|How does the water system work?',
    'a short chapter title is the suggestion name',
  );
  expect(
    !titled.join(' ').toLowerCase().includes('watermaker'),
    'a compound chapter title does not pull in extra equipment',
  );

  const authored = resolveAskSuggestions(
    ['Where is the fire extinguisher?'],
    { engines: { title: 'Engines' } },
  );
  expect(authored.join('|') === 'Where is the fire extinguisher?', 'published chips are kept');

  expect(resolveAskSuggestions([], { engines: {} }).join('|') === 'How do I start the engine?', 'an empty list is derived');
  return failures;
}
