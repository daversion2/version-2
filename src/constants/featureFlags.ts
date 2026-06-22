/**
 * Feature flags for toggling app features.
 * Community features are parked (hidden from UI) but code is preserved for future re-enablement.
 */
export const SHOW_COMMUNITY = false;

/**
 * Open-ended habit library (curated + traditional habit picker). Parked in favor of
 * the Practice Protocol, which is now the curated front door for recurring training.
 * Existing habits and custom-habit creation are unaffected; flip to re-enable browsing.
 */
export const SHOW_HABIT_LIBRARY = false;
