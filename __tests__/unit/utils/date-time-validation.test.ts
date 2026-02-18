/**
 * Unit tests for date/time validation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hasTimeConflict,
  validateScheduledTime,
  getExistingTimes,
  findNextAvailableSlot,
} from '@/lib/utils/date-time/validation';
import { VALIDATION_CONSTRAINTS } from '@/lib/utils/date-time/constants';

describe('hasTimeConflict', () => {
  it('should detect conflict within same minute', () => {
    const selected = new Date('2025-03-15T14:30:00');
    const existing = [new Date('2025-03-15T14:30:45').getTime()];

    expect(hasTimeConflict(selected, existing)).toBe(true);
  });

  it('should detect conflict at exact same time', () => {
    const selected = new Date('2025-03-15T14:30:00');
    const existing = [new Date('2025-03-15T14:30:00').getTime()];

    expect(hasTimeConflict(selected, existing)).toBe(true);
  });

  it('should not detect conflict in different minutes', () => {
    const selected = new Date('2025-03-15T14:30:00');
    const existing = [new Date('2025-03-15T14:31:00').getTime()];

    expect(hasTimeConflict(selected, existing)).toBe(false);
  });

  it('should not detect conflict with empty array', () => {
    const selected = new Date('2025-03-15T14:30:00');

    expect(hasTimeConflict(selected, [])).toBe(false);
  });

  it('should check against multiple existing times', () => {
    const selected = new Date('2025-03-15T14:30:00');
    const existing = [
      new Date('2025-03-15T14:00:00').getTime(),
      new Date('2025-03-15T14:30:30').getTime(), // Conflict here
      new Date('2025-03-15T15:00:00').getTime(),
    ];

    expect(hasTimeConflict(selected, existing)).toBe(true);
  });

  it('should handle times at minute boundary (00 seconds)', () => {
    const selected = new Date('2025-03-15T14:30:00');
    const existing = [new Date('2025-03-15T14:30:00').getTime()];

    expect(hasTimeConflict(selected, existing)).toBe(true);
  });

  it('should handle times at minute boundary (59 seconds)', () => {
    const selected = new Date('2025-03-15T14:30:59');
    const existing = [new Date('2025-03-15T14:30:00').getTime()];

    expect(hasTimeConflict(selected, existing)).toBe(true);
  });

  it('should not conflict across minute boundary', () => {
    const selected = new Date('2025-03-15T14:30:59');
    const existing = [new Date('2025-03-15T14:31:00').getTime()];

    expect(hasTimeConflict(selected, existing)).toBe(false);
  });
});

describe('validateScheduledTime', () => {
  beforeEach(() => {
    // Mock current time to a fixed point for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should accept valid future time with no conflicts', () => {
    const futureTime = new Date('2025-03-15T14:00:00Z');
    const result = validateScheduledTime(futureTime, []);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject past times', () => {
    const pastTime = new Date('2025-03-15T11:00:00Z');
    const minDate = new Date('2025-03-15T12:01:00Z');
    const result = validateScheduledTime(pastTime, [], minDate);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Time must be in the future');
  });

  it('should reject times beyond maximum range', () => {
    const farFuture = new Date('2025-07-15T12:00:00Z'); // >90 days
    const result = validateScheduledTime(farFuture, []);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Cannot schedule more than');
    expect(result.error).toContain('90 days');
  });

  it('should reject conflicting times', () => {
    const scheduledTime = new Date('2025-03-15T14:30:00Z');
    const existing = [new Date('2025-03-15T14:30:30Z').getTime()];
    const result = validateScheduledTime(scheduledTime, existing);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Another post is already scheduled at this time');
  });

  it('should accept time at exactly max days ahead', () => {
    const maxTime = new Date(
      Date.now() + VALIDATION_CONSTRAINTS.MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000
    );
    const result = validateScheduledTime(maxTime, []);

    expect(result.valid).toBe(true);
  });

  it('should use custom minDate when provided', () => {
    const scheduledTime = new Date('2025-03-16T09:00:00Z');
    const minDate = new Date('2025-03-17T09:00:00Z'); // Tomorrow
    const result = validateScheduledTime(scheduledTime, [], minDate);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Time must be in the future');
  });
});

describe('getExistingTimes', () => {
  it('should extract timestamps from posts array', () => {
    const posts = [
      { scheduled_for: 1710511800000 },
      { scheduled_for: 1710515400000 },
      { scheduled_for: 1710519000000 },
    ];

    const result = getExistingTimes(posts);

    expect(result).toEqual([1710511800000, 1710515400000, 1710519000000]);
  });

  it('should filter out invalid timestamps', () => {
    const posts = [
      { scheduled_for: 1710511800000 },
      { scheduled_for: NaN },
      { scheduled_for: 1710515400000 },
      { scheduled_for: undefined as unknown as number },
    ];

    const result = getExistingTimes(posts);

    expect(result).toEqual([1710511800000, 1710515400000]);
  });

  it('should handle empty array', () => {
    const result = getExistingTimes([]);

    expect(result).toEqual([]);
  });

  it('should preserve timestamp order', () => {
    const posts = [
      { scheduled_for: 1710519000000 },
      { scheduled_for: 1710511800000 },
      { scheduled_for: 1710515400000 },
    ];

    const result = getExistingTimes(posts);

    expect(result).toEqual([1710519000000, 1710511800000, 1710515400000]);
  });
});

describe('findNextAvailableSlot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return next minute when no conflicts', () => {
    const result = findNextAvailableSlot([]);

    // Should be at least 1 minute from now, rounded to minute boundary
    const expected = Math.ceil((Date.now() + 60000) / 60000) * 60000;
    expect(result).toBe(expected);
  });

  it('should skip conflicting minutes', () => {
    const now = Date.now();
    const nextMinute = Math.ceil((now + 60000) / 60000) * 60000;

    // Block next 3 minutes
    const existing = [nextMinute, nextMinute + 60000, nextMinute + 120000];

    const result = findNextAvailableSlot(existing);

    // Should return 4th minute
    expect(result).toBe(nextMinute + 180000);
  });

  it('should use custom minimum offset', () => {
    const customOffset = 3600000; // 1 hour
    const result = findNextAvailableSlot([], customOffset);

    const expected = Math.ceil((Date.now() + customOffset) / 60000) * 60000;
    expect(result).toBe(expected);
  });

  it('should round up to next minute boundary', () => {
    const result = findNextAvailableSlot([]);

    // Result should be divisible by 60000 (1 minute in ms)
    expect(result % 60000).toBe(0);
  });

  it('should respect max iterations limit', () => {
    const now = Date.now();
    const nextMinute = Math.ceil((now + 60000) / 60000) * 60000;

    // Block many minutes
    const existing = Array.from({ length: 100 }, (_, i) => nextMinute + i * 60000);

    const result = findNextAvailableSlot(existing, 60000, 50);

    // Should still find a slot within 50 iterations or return fallback
    expect(result).toBeGreaterThan(nextMinute);
  });

  it('should handle dense scheduling', () => {
    const now = Date.now();
    const nextMinute = Math.ceil((now + 60000) / 60000) * 60000;

    // Block every other minute for next hour
    const existing = Array.from({ length: 30 }, (_, i) => nextMinute + i * 120000);

    const result = findNextAvailableSlot(existing);

    // Should find one of the open slots
    expect(result % 60000).toBe(0);
    expect(existing).not.toContain(result);
  });
});
