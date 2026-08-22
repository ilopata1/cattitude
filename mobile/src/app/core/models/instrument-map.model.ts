export interface InstrumentBinding {
  path: string;
  source: string;
  fallback?: InstrumentBinding;
}

export interface InstrumentMap {
  version: number;
  instruments: Partial<Record<InstrumentRole, InstrumentBinding>>;
}

export type InstrumentRole =
  | 'heading'
  | 'cog'
  | 'speed'
  | 'depth'
  | 'awa'
  | 'aws'
  | 'twa'
  | 'tws'
  | 'set'
  | 'drift'
  | 'sog';

export interface InstrumentMapResponse {
  vesselId?: string;
  vesselSlug?: string;
  map: InstrumentMap | null;
  updatedAt?: string | null;
}

export interface SailEssentialsLive {
  depthM: number | null;
  speedKn: number | null;
  speedSource: 'stw' | 'sog' | null;
  stale: boolean;
}

export interface WindSteerLive {
  heading: number;
  cog: number;
  awa: number;
  aws: number;
  twa: number;
  tws: number;
  trueWindPath: string;
  headingFresh: boolean;
  cogFresh: boolean;
  awaFresh: boolean;
  awsFresh: boolean;
  twaFresh: boolean;
  twsFresh: boolean;
}

export const EMPTY_WIND_STEER: WindSteerLive = {
  heading: 0,
  cog: 0,
  awa: 0,
  aws: 0,
  twa: 0,
  tws: 0,
  trueWindPath: 'self.environment.wind.angleTrueWater',
  headingFresh: false,
  cogFresh: false,
  awaFresh: false,
  awsFresh: false,
  twaFresh: false,
  twsFresh: false,
};

export const EMPTY_SAIL_ESSENTIALS: SailEssentialsLive = {
  depthM: null,
  speedKn: null,
  speedSource: null,
  stale: true,
};
