export interface LatLon {
  lat: number;
  lon: number;
}

export interface VesselPosition {
  lat: number;
  lon: number;
  heading: number;      // resolved: compass heading preferred over COG
  sog: number;
  timestamp: number;
}

export interface VesselUpdate {
  mmsi: string;
  name?: string;
  lengthMetres?: number;
  beamMetres?: number;
  lat: number;
  lon: number;
  heading?: number;      // degrees true, compass-derived if available
  cog?: number;          // course over ground, fallback only
  sog: number;           // knots
  navStatus?: number;    // AIS navigational status field
  timestamp: number;     // Unix ms
}

export type VesselConfidence = 'low' | 'medium' | 'high';
export type VesselState = 'green' | 'amber' | 'red' | 'moving' | 'unknown';

export interface Vessel {
  mmsi: string;
  name: string;
  lengthMetres: number;
  beamMetres: number;
  positions: VesselPosition[];   // SOG-filtered, last 24 hours
  anchorPoint: LatLon | null;    // null until 2+ valid positions
  swingRadius: number;           // metres, 0 until anchor point known
  confidence: VesselConfidence;  // <5 positions = low, 5-15 = medium, >15 = high
  state: VesselState;
  isOwn: boolean;
  lastUpdated: number;
  tracked: boolean;              // true = within monitoring radius, full tracking; false = display-only
}
