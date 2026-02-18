/**
 * Unit tests for day options generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateDayOptions, getDayOptionForDate } from '@/lib/utils/date-time/day-options';
import { startOfDay, addDays } from 'date-fns';

describe('generateDayOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate default 30 days when count not specified', () => {
    const options = generateDayOptions();

    expect(options).toHaveLength(30);
  });

  it('should generate specified number of days', () => {
    const options = generateDayOptions(7);

    expect(options).toHaveLength(7);
  });

  it('should label first day as "Today"', () => {
    const options = generateDayOptions(3);

    expect(options[0].label).toBe('Today');
    expect(options[0].value).toBe('0');
  });

  it('should label second day as "Tomorrow"', () => {
    const options = generateDayOptions(3);

    expect(options[1].label).toBe('Tomorrow');
    expect(options[1].value).toBe('1');
  });

  it('should format other days with weekday and date', () => {
    const options = generateDayOptions(5);

    // Third day should have format like "Mon, Mar 17"
    expect(options[2].label).toMatch(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);
  });

  it('should use start of day for all dates', () => {
    const options = generateDayOptions(3);

    options.forEach((option) => {
      expect(option.date.getHours()).toBe(0);
      expect(option.date.getMinutes()).toBe(0);
      expect(option.date.getSeconds()).toBe(0);
      expect(option.date.getMilliseconds()).toBe(0);
    });
  });

  it('should have sequential day offsets as values', () => {
    const options = generateDayOptions(5);

    options.forEach((option, index) => {
      expect(option.value).toBe(String(index));
    });
  });

  it('should use custom reference date when provided', () => {
    const referenceDate = new Date('2025-06-20T10:00:00Z');
    const options = generateDayOptions(3, referenceDate);

    expect(options[0].label).toBe('Today');
    expect(options[0].date).toEqual(startOfDay(referenceDate));
  });

  it('should handle DST transition (spring forward)', () => {
    // March 9, 2025 - DST starts in US (example)
    const dstDate = new Date('2025-03-09T10:00:00');
    const options = generateDayOptions(5, dstDate);

    // Should generate 5 consecutive days despite DST change
    expect(options).toHaveLength(5);

    // Day offsets should still be correct
    options.forEach((option, index) => {
      const expectedDate = addDays(startOfDay(dstDate), index);
      expect(option.date.getTime()).toBe(expectedDate.getTime());
    });
  });

  it('should handle DST transition (fall back)', () => {
    // November 2, 2025 - DST ends in US (example)
    const dstDate = new Date('2025-11-02T10:00:00');
    const options = generateDayOptions(5, dstDate);

    expect(options).toHaveLength(5);

    // Verify dates are consecutive
    for (let i = 1; i < options.length; i++) {
      const prevDate = options[i - 1].date;
      const currDate = options[i].date;
      const diff = currDate.getTime() - prevDate.getTime();

      // Should be exactly 1 day apart (accounting for DST)
      expect(diff).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000); // At least 23 hours
      expect(diff).toBeLessThanOrEqual(25 * 60 * 60 * 1000); // At most 25 hours
    }
  });

  it('should handle leap year', () => {
    const leapYearDate = new Date('2024-02-28T10:00:00');
    const options = generateDayOptions(3, leapYearDate);

    expect(options[0].date.getDate()).toBe(28);
    expect(options[1].date.getDate()).toBe(29); // Feb 29 exists in 2024
    expect(options[1].date.getMonth()).toBe(1); // Still February
  });

  it('should handle month transitions', () => {
    const endOfMonth = new Date('2025-03-30T10:00:00');
    const options = generateDayOptions(5, endOfMonth);

    expect(options[0].date.getDate()).toBe(30);
    expect(options[0].date.getMonth()).toBe(2); // March
    expect(options[2].date.getDate()).toBe(1);
    expect(options[2].date.getMonth()).toBe(3); // April
  });

  it('should handle year transitions', () => {
    const endOfYear = new Date('2025-12-30T10:00:00');
    const options = generateDayOptions(5, endOfYear);

    expect(options[0].date.getFullYear()).toBe(2025);
    expect(options[2].date.getFullYear()).toBe(2026);
    expect(options[2].date.getMonth()).toBe(0); // January
  });
});

describe('getDayOptionForDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-15T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Today" for current date', () => {
    const today = new Date('2025-03-15T20:00:00Z'); // Same day, different time
    const option = getDayOptionForDate(today);

    expect(option).not.toBeNull();
    expect(option?.label).toBe('Today');
    expect(option?.value).toBe('0');
  });

  it('should return "Tomorrow" for next day', () => {
    const tomorrow = new Date('2025-03-16T10:00:00Z');
    const option = getDayOptionForDate(tomorrow);

    expect(option).not.toBeNull();
    expect(option?.label).toBe('Tomorrow');
    expect(option?.value).toBe('1');
  });

  it('should return formatted label for days after tomorrow', () => {
    const futureDate = new Date('2025-03-17T10:00:00Z'); // 2 days from now
    const option = getDayOptionForDate(futureDate);

    expect(option).not.toBeNull();
    expect(option?.label).toMatch(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);
    expect(option?.value).toBe('2');
  });

  it('should return null for past dates', () => {
    const pastDate = new Date('2025-03-14T10:00:00Z');
    const option = getDayOptionForDate(pastDate);

    expect(option).toBeNull();
  });

  it('should calculate correct day offset', () => {
    const futureDate = new Date('2025-03-20T10:00:00Z'); // 5 days from now
    const option = getDayOptionForDate(futureDate);

    expect(option).not.toBeNull();
    expect(option?.value).toBe('5');
  });

  it('should use custom reference date', () => {
    const referenceDate = new Date('2025-06-20T10:00:00Z');
    const targetDate = new Date('2025-06-21T15:00:00Z');
    const option = getDayOptionForDate(targetDate, referenceDate);

    expect(option).not.toBeNull();
    expect(option?.label).toBe('Tomorrow');
    expect(option?.value).toBe('1');
  });

  it('should ignore time component, only compare dates', () => {
    // Use date in middle of day to avoid timezone edge cases
    // System time is set to 2025-03-15T14:30:00Z in beforeEach
    const sameDayDifferentTime = new Date('2025-03-15T20:00:00Z');
    const option = getDayOptionForDate(sameDayDifferentTime);

    expect(option).not.toBeNull();
    // Both dates are on March 15 in UTC, so should be "Today"
    expect(option?.label).toBe('Today');
  });

  it('should handle DST transitions correctly', () => {
    const dstDate = new Date('2025-03-09T10:00:00');
    const targetDate = new Date('2025-03-10T10:00:00');
    const option = getDayOptionForDate(targetDate, dstDate);

    expect(option).not.toBeNull();
    expect(option?.value).toBe('1'); // Still tomorrow despite DST
  });

  it('should return start of day for date property', () => {
    const futureDate = new Date('2025-03-17T15:30:45Z');
    const option = getDayOptionForDate(futureDate);

    expect(option).not.toBeNull();
    expect(option?.date.getHours()).toBe(0);
    expect(option?.date.getMinutes()).toBe(0);
    expect(option?.date.getSeconds()).toBe(0);
  });
});
