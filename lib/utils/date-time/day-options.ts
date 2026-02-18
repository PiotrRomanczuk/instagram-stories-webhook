/**
 * Day Options Generation
 *
 * Generates date picker dropdown options with proper DST handling.
 * Uses date-fns for reliable date arithmetic.
 */

import { addDays, startOfDay, format } from 'date-fns';

export interface DayOption {
  /** Display label (e.g., "Today", "Tomorrow", "Sat, Mar 15") */
  label: string;
  /** Value for select/option element (day offset as string) */
  value: string;
  /** Date object for this day (at start of day, local timezone) */
  date: Date;
}

/**
 * Generate next N days for date picker dropdown.
 * Uses date-fns to properly handle DST transitions and date arithmetic.
 *
 * **Why date-fns?**
 * - Adding days manually (date.getDate() + 1) breaks during DST transitions
 * - date-fns handles timezone edge cases correctly
 *
 * @param count - Number of days to generate (default: 30)
 * @param referenceDate - Starting date (default: today)
 * @returns Array of day options with labels and dates
 *
 * @example
 * ```ts
 * const days = generateDayOptions(7);
 * // [
 * //   { label: 'Today', value: '0', date: Date(...) },
 * //   { label: 'Tomorrow', value: '1', date: Date(...) },
 * //   { label: 'Sat, Mar 15', value: '2', date: Date(...) },
 * //   ...
 * // ]
 * ```
 */
export function generateDayOptions(
  count = 30,
  referenceDate: Date = new Date()
): DayOption[] {
  const today = startOfDay(referenceDate);

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);

    // Generate human-friendly labels
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : format(date, 'EEE, MMM d'); // "Sat, Mar 15"

    return {
      label,
      value: String(i),
      date,
    };
  });
}

/**
 * Get day option for a specific date.
 * Returns the offset and label relative to today.
 *
 * @param targetDate - Date to find option for
 * @param referenceDate - Reference "today" date (default: now)
 * @returns Day option or null if date is in the past
 *
 * @example
 * ```ts
 * const tomorrow = new Date();
 * tomorrow.setDate(tomorrow.getDate() + 1);
 * const option = getDayOptionForDate(tomorrow);
 * // { label: 'Tomorrow', value: '1', date: Date(...) }
 * ```
 */
export function getDayOptionForDate(
  targetDate: Date,
  referenceDate: Date = new Date()
): DayOption | null {
  const today = startOfDay(referenceDate);
  const target = startOfDay(targetDate);

  // Calculate day difference
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Reject past dates
  if (diffDays < 0) {
    return null;
  }

  // Generate label
  const label =
    diffDays === 0
      ? 'Today'
      : diffDays === 1
      ? 'Tomorrow'
      : format(target, 'EEE, MMM d');

  return {
    label,
    value: String(diffDays),
    date: target,
  };
}
