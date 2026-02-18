/**
 * Schedule time utilities
 *
 * Provides functions for finding available scheduling slots.
 *
 * **DEPRECATED**: The 30-minute slot constraint has been removed.
 * Use `getNextAvailableSlot()` which allows minute-precision scheduling.
 */

import { findNextAvailableSlot } from './date-time';

/**
 * Get the next available 30-minute slot starting from now.
 * Rounds up to the next :00 or :30 boundary, then skips occupied slots.
 *
 * @deprecated Use `getNextAvailableSlot()` instead, which provides minute-precision scheduling.
 * This function enforces 30-minute boundaries which limits scheduling flexibility.
 *
 * @param existingTimes - Array of scheduled timestamps (ms) already in use
 * @returns Unix timestamp (ms) of the next available slot
 */
export function getNextAvailableSlot30Min(existingTimes: number[]): number {
	const SLOT_MS = 30 * 60 * 1000; // 30 minutes
	const MAX_ITERATIONS = 48; // 24 hours of 30-min slots

	// Round up to next :00 or :30 boundary
	const now = Date.now();
	let slot = Math.ceil(now / SLOT_MS) * SLOT_MS;

	// Ensure slot is in the future (at least 1 minute from now)
	if (slot - now < 60_000) {
		slot += SLOT_MS;
	}

	// Build a Set of occupied slot boundaries for O(1) lookup
	const occupied = new Set(
		existingTimes.map((t) => Math.round(t / SLOT_MS) * SLOT_MS),
	);

	// Find first unoccupied slot
	for (let i = 0; i < MAX_ITERATIONS; i++) {
		if (!occupied.has(slot)) {
			return slot;
		}
		slot += SLOT_MS;
	}

	// Fallback: return the slot after exhausting iterations
	return slot;
}

/**
 * Get the next available minute-precision slot starting from now.
 * Allows scheduling at any minute (not just :00/:30), providing more flexibility.
 *
 * **Replaces:** `getNextAvailableSlot30Min()` (deprecated 30-minute slots)
 *
 * @param existingTimes - Array of scheduled timestamps (ms) already in use
 * @param minOffsetMs - Minimum offset from now (default: 1 minute)
 * @returns Unix timestamp (ms) of the next available slot
 *
 * @example
 * ```ts
 * const existing = [Date.now() + 120000]; // 2 minutes from now
 * const nextSlot = getNextAvailableSlot(existing);
 * // Returns first free minute that's not occupied
 * ```
 */
export function getNextAvailableSlot(
	existingTimes: number[],
	minOffsetMs?: number
): number {
	return findNextAvailableSlot(existingTimes, minOffsetMs);
}
