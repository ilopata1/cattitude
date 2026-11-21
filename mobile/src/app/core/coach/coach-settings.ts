/**
 * Initial defaults for the sailing coach. Each threshold lives here once.
 * Owners tune these; rules must not embed their own copies.
 */

/** Same window the live instruments and the polar page already call stale. */
export const COACH_STREAM_STALE_MS = 15_000;

/**
 * A logbook fact older than the default log interval is stale.
 * Matches `DEFAULT_LOGBOOK_SETTINGS.intervalHours`.
 */
export const COACH_LOGBOOK_STALE_MS = 3 * 60 * 60 * 1000;

/** Arrival rate is computed from samples inside this span. */
export const COACH_RATE_WINDOW_MS = 10 * 60 * 1000;

/** Caps the arrival log so a long passage does not grow without bound. */
export const COACH_ARRIVAL_CAP = 1_200;

/** True wind angle below this is upwind. At the boundary the boat is on a reach. */
export const COACH_UPWIND_TWA_MAX_DEG = 70;

/** True wind angle above this is downwind. The boundary itself is still a reach. */
export const COACH_REACH_TWA_MAX_DEG = 110;

/** Sun below this elevation is night, civil twilight included. */
export const COACH_NIGHT_ELEVATION_MAX_DEG = -6;

/** Deep-water wavelength, metres, from the true period in seconds: factor × Tp². */
export const COACH_WAVE_LENGTH_M_PER_S2 = 1.56;

/** Deep-water phase speed, knots, from the true period in seconds. */
export const COACH_WAVE_PHASE_SPEED_KN_PER_S = 3.03;

/** Wind VMG flips to the downwind sign above this true wind angle, matching the A/B scorer. */
export const COACH_VMG_DOWNWIND_TWA_DEG = 90;

/** Helm bias uses the window only while true-wind-angle spread stays under this. */
export const HELM_STEADY_TWA_SD_DEG = 8;

/**
 * Seconds of rudder and heading ignored after a tack or gybe.
 * The same settle the A/B test uses (`AB_SETTLE_MS`).
 */
export const HELM_SETTLE_MS = 90_000;

/** A heading change larger than this starts the settle window. */
export const HELM_HEADING_CHANGE_DEG = 20;

/** Speed through water this far above the polar target can count as a surf. */
export const SURF_OVER_TARGET_PCT = 25;

/** A surf has to hold for at least this long. */
export const SURF_MIN_S = 3;

/** Polar samples older than this are not used for surf counts. */
export const COACH_POLAR_HISTORY_MIN = 60;

/** Log-versus-ground residual above this, and above the fraction below, flags the log. */
export const STW_RESIDUAL_KN = 0.5;

/** The residual must also exceed this share of speed through water. */
export const STW_RESIDUAL_FRACTION = 0.07;

/** Gusts this far above the mean are a reason to set sail for the gust, not the average. */
export const GUST_SPREAD_KN = 6;

/**
 * A gust warning that has gone quiet can be sent again after this.
 * A shorter gap, or a new gust speed in the same warning, stays quiet.
 */
export const GUST_WARNING_QUIET_MS = 30 * 60_000;

/** Reef-before-dark looks this far ahead of sunset. */
export const REEF_BEFORE_DARK_MIN = 60;

/** Reef before a watch change that is this close, when a sail cutover is also approaching. */
export const REEF_BEFORE_WATCH_MIN = 45;

/** Weather or lee helm from here up is worth naming. */
export const HELM_NOTABLE_DEG = 4;

/** Weather helm from here up is worth preparing for. */
export const HELM_SIGNIFICANT_DEG = 7;

/** Rudder movement from here up means the pilot or helm is working. */
export const RUDDER_SD_ELEVATED_DEG = 8;

/** Rudder movement from here up is high, and the finding asks for less sail. */
export const RUDDER_SD_HIGH_DEG = 12;

/** Heading wander from here up means the pilot or helm is working. */
export const HEADING_SD_WORK_DEG = 10;

/** Polar percent below this, on both the 30 and 60 minute windows, is low. Matches the sail-plan advisor. */
export const POLAR_LOW_PCT = 85;

/** Pitch motion from here up counts as a rough sea for the wave-angle note. */
export const MOTION_PITCH_ELEVATED_DEG = 2;

/** Vertical acceleration from here up counts as a rough sea, metres per second squared. */
export const MOTION_ACCEL_ELEVATED_MPS2 = 0.5;

/** Wave height divided by wavelength from here up is a short, steep sea. */
export const WAVE_STEEP = 0.05;

/** Waves travelling this far off the bow are on the quarter. */
export const WAVE_QUARTER_DEG = 135;

/** A heading change smaller than this is not worth suggesting. */
export const WAVE_HEADING_MIN_DEG = 5;

/**
 * Nose-dive advice stays off until the sign of `dirTravelBow` has been checked
 * on board against a known following sea.
 */
export const COACH_NOSE_DIVE_ENABLED = false;

/** Length ratio at or above this can bury the bows when the other nose-dive gates also hold. */
export const NOSE_DIVE_LENGTH_MIN = 0.8;

/** Length ratio above this is too long for the nose-dive gate. */
export const NOSE_DIVE_LENGTH_MAX = 2;

/** Boat speed at or above this share of the wave's phase speed is running with the sea. */
export const NOSE_DIVE_SPEED_FRACTION = 0.6;

/** Steepness at or above this joins the nose-dive gate. */
export const NOSE_DIVE_STEEPNESS = 0.04;

/** This many surfs in the window is enough to mention. */
export const SURF_FINDING_COUNT = 3;

/** A three-hour pressure fall of this size is notable. */
export const PRESSURE_NOTABLE_HPA = -3;

/** A three-hour pressure fall of this size is strong. */
export const PRESSURE_STRONG_HPA = -6;

/** A watch change this close triggers the handover note. */
export const WATCH_HANDOVER_MIN = 20;

/** The bottom line keeps at most this many decisions. */
export const COACH_BOTTOM_LINE_MAX = 3;

/** Caveats stay within this many lines. */
export const COACH_CAVEAT_LINES = 3;

/** Short briefing length, in words. */
export const COACH_BRIEF_SHORT_WORDS = 180;

/** Long briefing length, in words. */
export const COACH_BRIEF_LONG_WORDS = 450;

/** A briefing sentence stays within this many words. */
export const COACH_BRIEF_SENTENCE_WORDS = 25;

/** Wind speeds in the briefing are rounded to this step, in knots. */
export const COACH_WIND_ROUND_KN = 1;

/** Headings, wind angles, and wave angles are rounded to this step. */
export const COACH_ANGLE_ROUND_DEG = 5;

/** Helm and rudder angles stay at this step. The worked example keeps a 13° rudder. */
export const COACH_HELM_ROUND_DEG = 1;

/** Wave height in the briefing is rounded to this step, in metres. */
export const COACH_HS_ROUND_M = 0.1;

/** Polar percentages are rounded to this step. */
export const COACH_PERCENT_ROUND = 1;

/** Waves this close to dead astern are a following sea. */
export const FOLLOWING_STERN_DEG = 20;

/** The snapshot window the briefing describes. */
export const COACH_WINDOW_MIN = 30;

/** The on-screen briefing stays as it is until this long has passed. */
export const COACH_BRIEF_HOLD_MS = 10 * 60_000;

/** Background snapshot rebuilds wait at least this long between runs. */
export const COACH_REBUILD_MIN_MS = 60_000;

/** Stream samples kept for the hour of wind trend. */
export const COACH_SAMPLE_RETAIN_MS = 60 * 60_000;

/** The rewrite call gives up after this, then the software text stays. */
export const COACH_REWRITE_TIMEOUT_MS = 25_000;

/** A stored A/B test matches the present wind inside this true-wind-speed gap. */
export const AB_EVIDENCE_TWS_KN = 3;

/** A stored A/B test matches the present true wind angle inside this gap. */
export const AB_EVIDENCE_TWA_DEG = 15;

/** A stored A/B test is quoted only at this confidence or higher. */
export const AB_EVIDENCE_CONFIDENCE_PCT = 70;

/** Passage summaries are written on this interval. */
export const COACH_SUMMARY_MS = 10 * 60_000;

/** Summaries stay this long after the passage arrives, then they are dropped. */
export const COACH_SUMMARY_RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
