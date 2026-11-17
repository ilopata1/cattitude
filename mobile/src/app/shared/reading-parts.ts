/** Figure and unit for a live reading such as "7.4 kn" or "72%". */
export interface LiveReadingParts {
  figure: string;
  unit: string;
  /** True when the unit sits against the figure, as with % and °. */
  tight: boolean;
}

const SPACED = /^([+\-−]?\d[\d.,]*)\s+(.+)$/;
const TIGHT = /^([+\-−]?\d[\d.,]*)([%°])$/;

export function splitLiveReading(value: string | null | undefined): LiveReadingParts {
  const text = (value ?? '').trim();
  const spaced = SPACED.exec(text);
  if (spaced) {
    return { figure: spaced[1], unit: spaced[2], tight: false };
  }
  const tight = TIGHT.exec(text);
  if (tight) {
    return { figure: tight[1], unit: tight[2], tight: true };
  }
  return { figure: text, unit: '', tight: false };
}
