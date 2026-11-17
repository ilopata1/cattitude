import { splitLiveReading } from './reading-parts';

describe('splitLiveReading', () => {
  it('splits a spaced unit and keeps the figure', () => {
    expect(splitLiveReading('7.4 kn')).toEqual({ figure: '7.4', unit: 'kn', tight: false });
    expect(splitLiveReading('7.4 kn SOG')).toEqual({ figure: '7.4', unit: 'kn SOG', tight: false });
    expect(splitLiveReading('45 min')).toEqual({ figure: '45', unit: 'min', tight: false });
  });

  it('keeps percent and degrees tight against the figure', () => {
    expect(splitLiveReading('72%')).toEqual({ figure: '72', unit: '%', tight: true });
    expect(splitLiveReading('247°')).toEqual({ figure: '247', unit: '°', tight: true });
  });

  it('leaves a missing reading as a single figure', () => {
    expect(splitLiveReading('—')).toEqual({ figure: '—', unit: '', tight: false });
    expect(splitLiveReading(null)).toEqual({ figure: '', unit: '', tight: false });
  });
});
