export interface AnchorageSettings {
  /** MMSI of own vessel so we can mark it on the map. */
  ownMmsi: string;
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
  ownMmsi: '',
  trackingRadiusM: 200,
  monitoringCentre: null,
  windUseInSwingCalculations: false,
  windRangeStartDeg: 0,
  windRangeEndDeg: 90,
};
