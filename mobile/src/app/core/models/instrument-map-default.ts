import { InstrumentMap } from './instrument-map.model';

/** Shipped defaults when the API has no vessel-specific map. */
export const DEFAULT_INSTRUMENT_MAP: InstrumentMap = {
  version: 1,
  instruments: {
    heading: { path: 'self.navigation.headingTrue', source: 'default' },
    cog: { path: 'self.navigation.courseOverGroundTrue', source: 'default' },
    speed: {
      path: 'self.navigation.speedThroughWater',
      source: 'default',
      fallback: { path: 'self.navigation.speedOverGround', source: 'default' },
    },
    depth: { path: 'self.environment.depth.belowTransducer', source: 'default' },
    awa: { path: 'self.environment.wind.angleApparent', source: 'default' },
    aws: { path: 'self.environment.wind.speedApparent', source: 'default' },
    twa: { path: 'self.environment.wind.angleTrueWater', source: 'default' },
    tws: { path: 'self.environment.wind.speedTrue', source: 'default' },
  },
};
