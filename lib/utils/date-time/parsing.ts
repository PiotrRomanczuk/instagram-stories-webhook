/**
 * Date/Time Parsing Utilities
 *
 * CRITICAL: This module fixes the ISO 8601 parsing ambiguity bug where
 * `new Date(\`${dateStr}T${timeStr}\`)` is parsed differently across browsers
 * (local vs UTC interpretation).
 *
 * All functions in this module guarantee consistent local timezone interpretation.
 */

/**
 * Safely combine date and time strings into a Date object.
 * Always interprets in local timezone (no ISO 8601 browser ambiguity).
 *
 * **Why this function exists:**
 * - `new Date("2025-03-15T14:30")` is ambiguous in ISO 8601
 * - Some browsers interpret as UTC, others as local time
 * - This function explicitly constructs Date in local timezone
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:MM format (24-hour)
 * @returns Date object in local timezone
 * @throws {Error} If date or time format is invalid
 *
 * @example
 * ```ts
 * // ✅ Correct - Consistent across all browsers
 * const date = combineDateAndTime('2025-03-15', '14:30');
 *
 * // ❌ Avoid - Browser-dependent behavior
 * const date = new Date('2025-03-15T14:30');
 * ```
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD`);
  }

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: "${timeStr}". Expected HH:MM`);
  }

  // Validate ranges
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be 1-12`);
  }

  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Must be 1-31`);
  }

  if (hours < 0 || hours > 23) {
    throw new Error(`Invalid hours: ${hours}. Must be 0-23`);
  }

  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes: ${minutes}. Must be 0-59`);
  }

  // Use Date constructor with explicit components (months are 0-indexed)
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Format a Date object into separate date and time strings.
 * Inverse of combineDateAndTime().
 *
 * @param date - Date object to format
 * @returns Object with dateStr (YYYY-MM-DD) and timeStr (HH:MM)
 *
 * @example
 * ```ts
 * const date = new Date(2025, 2, 15, 14, 30); // March 15, 2025, 2:30 PM
 * const { dateStr, timeStr } = splitDateAndTime(date);
 * // dateStr: "2025-03-15"
 * // timeStr: "14:30"
 * ```
 */
export function splitDateAndTime(date: Date): {
  dateStr: string;
  timeStr: string;
} {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hours}:${minutes}`,
  };
}
