import { askSuggestionFailures } from './ask-suggestions.check';

describe('ask suggestions', () => {
  it('builds chips from the systems a vessel published', () => {
    expect(askSuggestionFailures()).toEqual([]);
  });
});
