/**
 * Date/Time Validation Utilities
 *
 * Provides conflict detection and validation for scheduled times.
 * Uses second-level precision to match Instagram API behavior.
 */

import { VALIDATION_CONSTRAINTS } from './constants';

/**
 * Check if a scheduled time conflicts with existing posts.
 * Uses second-level precision (Instagram API granularity).
 *
 * **Precision rationale:**
 * - Instagram API accepts times with second precision
 * - Two posts scheduled in the same minute are considered conflicts
 * - Minute-level rounding (not 30-min slots) for maximum flexibility
 *
 * @param selectedTime - Date to check for conflicts
 * @param existingTimes - Array of existing scheduled timestamps (milliseconds)
 * @returns True if there's a conflict within the same minute
 *
 * @example
 * ```ts
 * const selected = new Date('2025-03-15T14:30:00');
 * const existing = [new Date('2025-03-15T14:30:45').getTime()];
 *
 * hasTimeConflict(selected, existing); // true (same minute)
 * ```
 */
export function hasTimeConflict(
  selectedTime: Date,
  existingTimes: number[]
): boolean {
  // Round to minute boundary for conflict detection
  const selectedMinute = Math.floor(selectedTime.getTime() / 60000) * 60000;

  return existingTimes.some((existingMs) => {
    const existingMinute = Math.floor(existingMs / 60000) * 60000;

    // Conflict if in the same minute (both round to same minute boundary)
    return selectedMinute === existingMinute;
  });
}

/**
 * Validate a scheduled time against constraints.
 * Checks minimum offset, maximum range, and conflicts.
 *
 * @param scheduledTime - Date to validate
 * @param existingTimes - Array of existing scheduled timestamps
 * @param minDate - Minimum allowed date (default: now + 1 minute)
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```ts
 * const result = validateScheduledTime(new Date(), []);
 * if (!result.valid) {
 *   console.error(result.error); // "Time must be in the future"
 * }
 * ```
 */
export function validateScheduledTime(
  scheduledTime: Date,
  existingTimes: number[] = [],
  minDate: Date = new Date(Date.now() + VALIDATION_CONSTRAINTS.MIN_OFFSET_MS)
): { valid: boolean; error?: string } {
  const now = Date.now();
  const scheduledMs = scheduledTime.getTime();

  // Check minimum offset
  if (scheduledMs < minDate.getTime()) {
    return {
      valid: false,
      error: 'Time must be in the future',
    };
  }

  // Check maximum range (90 days ahead per Instagram API)
  const maxMs = now + VALIDATION_CONSTRAINTS.MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  if (scheduledMs > maxMs) {
    return {
      valid: false,
      error: `Cannot schedule more than ${VALIDATION_CONSTRAINTS.MAX_DAYS_AHEAD} days ahead`,
    };
  }

  // Check conflicts
  if (hasTimeConflict(scheduledTime, existingTimes)) {
    return {
      valid: false,
      error: 'Another post is already scheduled at this time',
    };
  }

  return { valid: true };
}

/**
 * Get all existing scheduled times from posts array.
 * Helper to extract timestamps for conflict checking.
 *
 * @param posts - Array of scheduled posts
 * @returns Array of timestamps in milliseconds
 *
 * @example
 * ```ts
 * const posts = [
 *   { scheduled_for: 1710511800000 },
 *   { scheduled_for: 1710515400000 },
 * ];
 * const times = getExistingTimes(posts);
 * // [1710511800000, 1710515400000]
 * ```
 */
export function getExistingTimes(
  posts: Array<{ scheduled_for: number }>
): number[] {
  return posts
    .map((post) => post.scheduled_for)
    .filter((time): time is number => typeof time === 'number' && !isNaN(time));
}

/**
 * Find the next available minute-precision slot.
 * Iterates through minutes (not 30-min slots) to find first unoccupied time.
 *
 * **Changed from 30-min slots:**
 * - Old: Only allowed :00 and :30 minutes
 * - New: Allows any minute (0-59)
 * - Provides more scheduling flexibility
 *
 * @param existingTimes - Array of existing scheduled timestamps
 * @param minOffsetMs - Minimum offset from now (default: 1 minute)
 * @param maxIterations - Maximum minutes to search (default: 1440 = 24 hours)
 * @returns Timestamp of next available slot
 *
 * @example
 * ```ts
 * const existing = [Date.now() + 120000]; // 2 minutes from now
 * const nextSlot = findNextAvailableSlot(existing);
 * // Returns first free minute after the conflict
 * ```
 */
export function findNextAvailableSlot(
  existingTimes: number[],
  minOffsetMs: number = VALIDATION_CONSTRAINTS.MIN_OFFSET_MS,
  maxIterations = 1440 // 24 hours in minutes
): number {
  const now = Date.now();
  let candidate = now + minOffsetMs;

  // Round up to next minute boundary
  candidate = Math.ceil(candidate / 60_000) * 60_000;

  // Convert existing times to minute-level precision set for fast lookup
  const existingMinutes = new Set(
    existingTimes.map((t) => Math.floor(t / 60_000) * 60_000)
  );

  // Find first unoccupied minute (max 24 hours)
  for (let i = 0; i < maxIterations; i++) {
    if (!existingMinutes.has(candidate)) {
      return candidate;
    }
    candidate += 60_000; // Advance by 1 minute
  }

  // Fallback: return time after 24 hours
  return candidate;
}
