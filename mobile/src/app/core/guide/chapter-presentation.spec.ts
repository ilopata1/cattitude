import { chapterPresentationFailures } from './chapter-presentation.check';

describe('chapter presentation', () => {
  it('sorts published sections into the five-part chapter', () => {
    expect(chapterPresentationFailures()).toEqual([]);
  });
});
