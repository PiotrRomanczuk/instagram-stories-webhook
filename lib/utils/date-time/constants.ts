/**
 * Date/Time Constants
 *
 * Shared constants for time selection UI components.
 * Eliminates duplication across DateTimePicker, ScheduleTimeSheet, etc.
 */

/**
 * Best times for scheduling Instagram Stories.
 * Based on engagement data showing optimal posting times.
 *
 * Used in:
 * - DateTimePicker (quick pick buttons)
 * - ScheduleTimeSheet (mobile bottom sheet)
 * - ScheduleDialog (quick scheduling)
 */
export const BEST_TIMES = [
  { label: '09:00', hours: 9, minutes: 0 },
  { label: '12:00', hours: 12, minutes: 0 },
  { label: '18:30', hours: 18, minutes: 30 },
] as const;

/**
 * Quick pick time offsets (relative to now).
 * Used for "In 1 hour", "In 3 hours" buttons.
 */
export const QUICK_PICK_OFFSETS = [
  { label: 'In 1 hour', hours: 1 },
  { label: 'In 3 hours', hours: 3 },
  { label: 'Tomorrow 9am', hours: 9, relativeDay: 1 },
] as const;

/**
 * Time format constants
 */
export const TIME_FORMAT = {
  /** Display format for user-facing times (e.g., "2:30 PM") */
  DISPLAY_12H: 'h:mm a',
  /** Display format for user-facing times (e.g., "14:30") */
  DISPLAY_24H: 'HH:mm',
  /** ISO format for date strings (e.g., "2025-03-15") */
  DATE_ISO: 'yyyy-MM-dd',
  /** Input format for native HTML inputs */
  INPUT_TIME: 'HH:mm',
} as const;

/**
 * Validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  /** Minimum scheduling offset from now (1 minute) */
  MIN_OFFSET_MS: 60_000,
  /** Maximum scheduling window (90 days per Instagram API) */
  MAX_DAYS_AHEAD: 90,
  /** Conflict detection window (within same minute) */
  CONFLICT_WINDOW_MS: 60_000,
} as const;
