/** Guest shows every section except those tagged crew. Crew shows all of them. */

export type ReaderView = 'guest' | 'crew';

export function sectionVisible(section: { audience?: unknown }, view: ReaderView): boolean {
  return view === 'crew' || section.audience !== 'crew';
}
