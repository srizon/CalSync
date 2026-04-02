/** Private extended property on mirrored blocks — value is `${sourceCalendarId}|${sourceEventId}`. */
export const CALSYNC_SOURCE_KEY = "calsyncSource";

/** How far ahead to mirror events */
export const SYNC_WINDOW_DAYS = 90;

export const OAUTH_STATE_COOKIE = "calsync_oauth_state";
export const OAUTH_STATE_MAX_AGE_SEC = 600;

/** Set to "add" when linking an additional Google account (see /api/auth/google?add=1). */
export const OAUTH_INTENT_COOKIE = "calsync_oauth_intent";
