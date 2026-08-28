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

/**
 * Where the reported position sits on the hull (Signal-K `sensors.ais.*`).
 * `fromBow` is measured aft from the bow; `fromCenter` is positive to port,
 * negative to starboard. Absent for most AIS targets.
 */
export interface AisReferencePoint {
  fromBow: number | null;
  fromCenter: number | null;
}

export interface VesselUpdate {
  mmsi: string;
  name?: string;
  lengthMetres?: number;
  beamMetres?: number;
  aisFromBow?: number;
  aisFromCenter?: number;
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
  /** Null when AIS did not report the reference point. */
  aisRef: AisReferencePoint;
  positions: VesselPosition[];   // SOG-filtered, last 24 hours
  anchorPoint: LatLon | null;    // null until 2+ valid positions
  swingRadius: number;           // metres, 0 until anchor point known
  confidence: VesselConfidence;  // <5 positions = low, 5-15 = medium, >15 = high
  state: VesselState;
  isOwn: boolean;
  lastUpdated: number;
  tracked: boolean;              // true = within monitoring radius, full tracking; false = display-only
}
