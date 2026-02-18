/**
 * Timezone Strategy Documentation & Utilities
 *
 * CRITICAL ARCHITECTURE DECISION:
 * ================================
 * All scheduling times are in the USER'S BROWSER TIMEZONE.
 *
 * ## How it works:
 *
 * 1. **User Interface:**
 *    - User sees times in their LOCAL timezone (e.g., "3:00 PM EST")
 *    - Time pickers display local timezone label
 *    - No timezone conversion in UI layer
 *
 * 2. **Storage Layer:**
 *    - Database stores Unix timestamps (UTC milliseconds since epoch)
 *    - Conversion happens automatically via `Date.getTime()`
 *    - Example: User selects "3:00 PM EST" → Stored as `1710439200000` (UTC)
 *
 * 3. **Display Layer:**
 *    - Timestamps converted back to local time via `new Date(timestamp)`
 *    - User always sees times in their current browser timezone
 *
 * ## Behavioral implications:
 *
 * ✅ **Correct behavior:**
 * - User in New York schedules "3:00 PM" → Post publishes at 3:00 PM EST
 * - Same user travels to London → Post now shows as "8:00 PM GMT" (still same moment)
 * - This is EXPECTED - user's perspective changes with timezone
 *
 * ❌ **NOT supported:**
 * - "Schedule this post at 3 PM in every timezone" (multi-timezone scheduling)
 * - "Pin this post to 3 PM EST even if I'm in London" (fixed timezone)
 * - These require server-side timezone storage (not needed for single-user app)
 *
 * ## Why this approach?
 *
 * 1. **Simplicity**: No timezone conversion logic needed
 * 2. **Single-user context**: Instagram accounts typically managed from one location
 * 3. **Browser timezone = Instagram account timezone**: Assumption holds for 99% of users
 * 4. **Instagram API compatibility**: API accepts Unix timestamps, handles timezone internally
 *
 * ## Edge cases:
 *
 * - **DST transitions**: date-fns handles automatically in day generation
 * - **User changes timezone**: Displayed times update to reflect new perspective
 * - **Server timezone**: Irrelevant - all scheduling uses client timestamps
 *
 * ## Alternative considered:
 *
 * Store timezone offset with each post:
 * ```ts
 * {
 *   scheduled_for: 1710439200000,
 *   timezone_offset: -300, // EST = UTC-5
 *   timezone_name: "America/New_York"
 * }
 * ```
 *
 * **Rejected because:**
 * - Adds complexity without clear user benefit
 * - Instagram API doesn't support timezone-aware scheduling
 * - Multi-timezone scheduling not a user requirement
 */

/**
 * Get the user's current timezone identifier.
 *
 * @returns IANA timezone name (e.g., "America/New_York", "Europe/London")
 *
 * @example
 * ```ts
 * const tz = getUserTimezone();
 * // "America/New_York" (EST/EDT)
 * ```
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get a human-friendly timezone label.
 * Extracts city name from IANA identifier.
 *
 * @returns Timezone label (e.g., "New York", "London")
 *
 * @example
 * ```ts
 * const label = getTimezoneLabel();
 * // "New York" (from "America/New_York")
 * ```
 */
export function getTimezoneLabel(): string {
  const tz = getUserTimezone();

  // Extract city name from IANA format (e.g., "America/New_York" → "New York")
  const parts = tz.split('/');
  const city = parts[parts.length - 1] || tz;

  // Replace underscores with spaces
  return city.replace(/_/g, ' ');
}

/**
 * Get the current timezone offset in minutes.
 * Negative for timezones west of UTC, positive for east.
 *
 * @returns Offset in minutes (e.g., -300 for EST, 60 for CET)
 *
 * @example
 * ```ts
 * const offset = getTimezoneOffset();
 * // -300 (EST = UTC-5 hours)
 * ```
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Format timezone offset as string (e.g., "UTC-5", "UTC+1").
 *
 * @returns Formatted offset string
 *
 * @example
 * ```ts
 * const formatted = formatTimezoneOffset();
 * // "UTC-5" (for EST)
 * // "UTC+1" (for CET)
 * ```
 */
export function formatTimezoneOffset(): string {
  const offset = getTimezoneOffset();
  const hours = Math.abs(offset / 60);
  const sign = offset > 0 ? '-' : '+'; // Offset is negative for ahead of UTC

  return `UTC${sign}${hours}`;
}

/**
 * Get full timezone display string for UI.
 * Combines city name and UTC offset.
 *
 * @returns Display string (e.g., "New York (UTC-5)")
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <span>Times shown in {getTimezoneDisplay()}</span>
 * </Tooltip>
 * // "Times shown in New York (UTC-5)"
 * ```
 */
export function getTimezoneDisplay(): string {
  const label = getTimezoneLabel();
  const offset = formatTimezoneOffset();

  return `${label} (${offset})`;
}
