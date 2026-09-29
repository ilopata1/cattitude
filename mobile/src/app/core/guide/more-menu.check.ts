import { moreMenu } from './more-menu';

export function moreMenuFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };
  const ids = (vesselType: string) => moreMenu(vesselType).map((row) => row.id);
  const label = (vesselType: string, id: string) =>
    moreMenu(vesselType).find((row) => row.id === id)?.label;

  for (const vesselType of ['sailing_catamaran', 'sailing_trimaran', 'cruising_monohull']) {
    expect(
      ids(vesselType).join(',') === 'ask,sail,polar,anchorage,settings',
      `${vesselType} more rows`,
    );
    expect(label(vesselType, 'sail') === 'Sail', `${vesselType} sail label`);
  }
  for (const vesselType of ['power_catamaran', 'motor_yacht', 'sport_fishing', '']) {
    expect(
      ids(vesselType).join(',') === 'ask,sail,anchorage,settings',
      `${vesselType || 'unset'} more rows`,
    );
    expect(label(vesselType, 'sail') === 'Instruments', `${vesselType || 'unset'} instruments label`);
    expect(!ids(vesselType).includes('polar'), `${vesselType || 'unset'} hides polar`);
  }
  return failures;
}
