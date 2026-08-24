export interface AnchorageSettings {
  /** Monitoring radius in metres — vessels outside this radius are displayed only. */
  trackingRadiusM: number;
  /** Optional fixed monitoring centre.  When null, auto-follows own vessel. */
  monitoringCentre: { lat: number; lon: number } | null;
  /** Include wind filtering when downgrading amber to green. */
  windUseInSwingCalculations: boolean;
  /** Meteorological wind-from start (°). */
  windRangeStartDeg: number;
  /** Meteorological wind-from end (°). */
  windRangeEndDeg: number;
}

export const DEFAULT_ANCHORAGE_SETTINGS: AnchorageSettings = {
  trackingRadiusM: 200,
  monitoringCentre: null,
  windUseInSwingCalculations: false,
  windRangeStartDeg: 0,
  windRangeEndDeg: 90,
};

export interface AnchorageAlert {
  id: string;
  vesselMmsi: string;
  otherMmsi: string;
  vesselName: string;
  otherName: string;
  type: 'collision' | 'rode_conflict';
  state: 'red' | 'amber';
  timestamp: number;
  resolved: boolean;
}
