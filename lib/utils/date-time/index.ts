/**
 * Date/Time Utilities
 *
 * Centralized utilities for consistent date/time handling across the app.
 *
 * ## Critical Bug Fixes:
 * - ✅ ISO 8601 parsing ambiguity (browser-dependent behavior)
 * - ✅ Timezone strategy documentation
 * - ✅ Conflict detection precision (second-level, not minute-level)
 * - ✅ DST-safe date arithmetic
 *
 * ## Key Changes:
 * - Removed 30-minute slot constraint (now allows any minute)
 * - Unified constants across components
 * - Explicit timezone handling
 *
 * @see {@link ./parsing.ts} - Safe date/time parsing (CRITICAL)
 * @see {@link ./validation.ts} - Conflict detection and validation
 * @see {@link ./timezone.ts} - Timezone strategy documentation
 * @see {@link ./constants.ts} - Shared constants
 * @see {@link ./day-options.ts} - Day picker generation
 */

// Parsing utilities (CRITICAL - fixes ISO 8601 bug)
export { combineDateAndTime, splitDateAndTime } from './parsing';

// Validation utilities
export {
  hasTimeConflict,
  validateScheduledTime,
  getExistingTimes,
  findNextAvailableSlot,
} from './validation';

// Timezone utilities
export {
  getUserTimezone,
  getTimezoneLabel,
  getTimezoneOffset,
  formatTimezoneOffset,
  getTimezoneDisplay,
} from './timezone';

// Day options generation
export { generateDayOptions, getDayOptionForDate, type DayOption } from './day-options';

// Constants
export { BEST_TIMES, QUICK_PICK_OFFSETS, TIME_FORMAT, VALIDATION_CONSTRAINTS } from './constants';
