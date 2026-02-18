/**
 * Unit tests for date/time parsing utilities
 *
 * Tests the critical ISO 8601 parsing fix and validates
 * consistent behavior across edge cases.
 */

import { describe, it, expect } from 'vitest';
import { combineDateAndTime, splitDateAndTime } from '@/lib/utils/date-time/parsing';

describe('combineDateAndTime', () => {
  describe('valid inputs', () => {
    it('should combine valid date and time strings', () => {
      const result = combineDateAndTime('2025-03-15', '14:30');

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should handle midnight (00:00)', () => {
      const result = combineDateAndTime('2025-01-01', '00:00');

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('should handle end of day (23:59)', () => {
      const result = combineDateAndTime('2025-12-31', '23:59');

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });

    it('should handle single-digit hours with leading zero', () => {
      const result = combineDateAndTime('2025-06-15', '09:30');

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle single-digit minutes with leading zero', () => {
      const result = combineDateAndTime('2025-06-15', '14:05');

      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(5);
    });

    it('should handle leap year date (Feb 29)', () => {
      const result = combineDateAndTime('2024-02-29', '12:00');

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29);
    });

    it('should handle first day of month', () => {
      const result = combineDateAndTime('2025-01-01', '10:00');

      expect(result.getDate()).toBe(1);
    });

    it('should handle last day of month (31 days)', () => {
      const result = combineDateAndTime('2025-03-31', '10:00');

      expect(result.getDate()).toBe(31);
    });

    it('should handle last day of month (30 days)', () => {
      const result = combineDateAndTime('2025-04-30', '10:00');

      expect(result.getDate()).toBe(30);
    });

    it('should handle last day of February (non-leap year)', () => {
      const result = combineDateAndTime('2025-02-28', '10:00');

      expect(result.getDate()).toBe(28);
    });
  });

  describe('timezone consistency', () => {
    it('should always interpret in local timezone, not UTC', () => {
      const result = combineDateAndTime('2025-03-15', '14:30');

      // Get local timezone offset
      const offset = result.getTimezoneOffset();

      // Verify the Date represents 14:30 in LOCAL time
      // (not 14:30 UTC converted to local)
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);

      // The ISO string should show UTC time with offset applied
      const isoString = result.toISOString();
      const utcHours = parseInt(isoString.substring(11, 13));

      // Calculate expected UTC hour (14 + offset in hours)
      const expectedUtcHour = (14 + Math.floor(offset / 60) + 24) % 24;

      // Allow for DST and timezone variations
      expect([expectedUtcHour, (expectedUtcHour + 1) % 24, (expectedUtcHour - 1 + 24) % 24])
        .toContain(utcHours);
    });

    it('should produce same timestamp when called multiple times', () => {
      const result1 = combineDateAndTime('2025-03-15', '14:30');
      const result2 = combineDateAndTime('2025-03-15', '14:30');

      expect(result1.getTime()).toBe(result2.getTime());
    });
  });

  describe('invalid date formats', () => {
    it('should throw error for invalid date format (MM-DD-YYYY)', () => {
      // This format parses as 03=year, 15=month, 2025=day
      // Function correctly identifies month is out of range
      expect(() => combineDateAndTime('03-15-2025', '14:30'))
        .toThrow('Invalid month: 15');
    });

    it('should throw error for invalid date format (DD/MM/YYYY)', () => {
      expect(() => combineDateAndTime('15/03/2025', '14:30'))
        .toThrow('Invalid date format');
    });

    it('should throw error for empty date string', () => {
      expect(() => combineDateAndTime('', '14:30'))
        .toThrow('Invalid date format');
    });

    it('should throw error for non-numeric date components', () => {
      expect(() => combineDateAndTime('2025-abc-15', '14:30'))
        .toThrow('Invalid date format');
    });

    it('should throw error for invalid month (0)', () => {
      expect(() => combineDateAndTime('2025-00-15', '14:30'))
        .toThrow('Invalid month: 0');
    });

    it('should throw error for invalid month (13)', () => {
      expect(() => combineDateAndTime('2025-13-15', '14:30'))
        .toThrow('Invalid month: 13');
    });

    it('should throw error for invalid day (0)', () => {
      expect(() => combineDateAndTime('2025-03-00', '14:30'))
        .toThrow('Invalid day: 0');
    });

    it('should throw error for invalid day (32)', () => {
      expect(() => combineDateAndTime('2025-03-32', '14:30'))
        .toThrow('Invalid day: 32');
    });
  });

  describe('invalid time formats', () => {
    it('should throw error for invalid time format (12-hour with AM/PM)', () => {
      expect(() => combineDateAndTime('2025-03-15', '2:30 PM'))
        .toThrow('Invalid time format');
    });

    it('should accept single-digit hours (H:MM format)', () => {
      // '2:30' is actually valid - splits to hours=2, minutes=30
      // No need to enforce leading zeros for parsing
      const result = combineDateAndTime('2025-03-15', '2:30');
      expect(result.getHours()).toBe(2);
      expect(result.getMinutes()).toBe(30);
    });

    it('should throw error for empty time string', () => {
      expect(() => combineDateAndTime('2025-03-15', ''))
        .toThrow('Invalid time format');
    });

    it('should throw error for non-numeric time components', () => {
      expect(() => combineDateAndTime('2025-03-15', 'ab:cd'))
        .toThrow('Invalid time format');
    });

    it('should throw error for invalid hours (24)', () => {
      expect(() => combineDateAndTime('2025-03-15', '24:00'))
        .toThrow('Invalid hours: 24');
    });

    it('should throw error for invalid hours (negative)', () => {
      expect(() => combineDateAndTime('2025-03-15', '-1:30'))
        .toThrow('Invalid hours');
    });

    it('should throw error for invalid minutes (60)', () => {
      expect(() => combineDateAndTime('2025-03-15', '14:60'))
        .toThrow('Invalid minutes: 60');
    });

    it('should throw error for invalid minutes (negative)', () => {
      expect(() => combineDateAndTime('2025-03-15', '14:-1'))
        .toThrow('Invalid minutes');
    });
  });

  describe('edge cases', () => {
    it('should handle year 2000 (Y2K)', () => {
      const result = combineDateAndTime('2000-01-01', '00:00');

      expect(result.getFullYear()).toBe(2000);
    });

    it('should handle year 2100 (non-leap year)', () => {
      const result = combineDateAndTime('2100-02-28', '12:00');

      expect(result.getFullYear()).toBe(2100);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(28);
    });

    it('should handle far future date', () => {
      const result = combineDateAndTime('2099-12-31', '23:59');

      expect(result.getFullYear()).toBe(2099);
    });

    it('should handle dates during DST transition (spring forward)', () => {
      // In many timezones, 2:30 AM doesn't exist on this day
      // Date constructor should handle this gracefully
      const result = combineDateAndTime('2025-03-09', '02:30');

      expect(result).toBeInstanceOf(Date);
      expect(result.getDate()).toBeGreaterThanOrEqual(9);
    });

    it('should handle dates during DST transition (fall back)', () => {
      // In many timezones, 1:30 AM occurs twice on this day
      // Date constructor should use first occurrence
      const result = combineDateAndTime('2025-11-02', '01:30');

      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(1);
    });
  });
});

describe('splitDateAndTime', () => {
  describe('valid dates', () => {
    it('should split Date into date and time strings', () => {
      const date = new Date(2025, 2, 15, 14, 30, 0, 0); // March 15, 2025, 2:30 PM
      const result = splitDateAndTime(date);

      expect(result.dateStr).toBe('2025-03-15');
      expect(result.timeStr).toBe('14:30');
    });

    it('should handle midnight', () => {
      const date = new Date(2025, 0, 1, 0, 0, 0, 0); // Jan 1, 2025, 00:00
      const result = splitDateAndTime(date);

      expect(result.dateStr).toBe('2025-01-01');
      expect(result.timeStr).toBe('00:00');
    });

    it('should handle end of day', () => {
      const date = new Date(2025, 11, 31, 23, 59, 0, 0); // Dec 31, 2025, 23:59
      const result = splitDateAndTime(date);

      expect(result.dateStr).toBe('2025-12-31');
      expect(result.timeStr).toBe('23:59');
    });

    it('should pad single-digit months with leading zero', () => {
      const date = new Date(2025, 0, 15, 14, 30, 0, 0); // January
      const result = splitDateAndTime(date);

      expect(result.dateStr).toBe('2025-01-15');
    });

    it('should pad single-digit days with leading zero', () => {
      const date = new Date(2025, 2, 5, 14, 30, 0, 0); // 5th day
      const result = splitDateAndTime(date);

      expect(result.dateStr).toBe('2025-03-05');
    });

    it('should pad single-digit hours with leading zero', () => {
      const date = new Date(2025, 2, 15, 9, 30, 0, 0); // 9 AM
      const result = splitDateAndTime(date);

      expect(result.timeStr).toBe('09:30');
    });

    it('should pad single-digit minutes with leading zero', () => {
      const date = new Date(2025, 2, 15, 14, 5, 0, 0); // 5 minutes
      const result = splitDateAndTime(date);

      expect(result.timeStr).toBe('14:05');
    });
  });

  describe('round-trip consistency', () => {
    it('should be inverse of combineDateAndTime', () => {
      const original = combineDateAndTime('2025-03-15', '14:30');
      const { dateStr, timeStr } = splitDateAndTime(original);
      const reconstructed = combineDateAndTime(dateStr, timeStr);

      expect(reconstructed.getTime()).toBe(original.getTime());
    });

    it('should handle multiple round trips', () => {
      const original = combineDateAndTime('2025-06-20', '09:45');

      for (let i = 0; i < 5; i++) {
        const { dateStr, timeStr } = splitDateAndTime(original);
        const reconstructed = combineDateAndTime(dateStr, timeStr);
        expect(reconstructed.getTime()).toBe(original.getTime());
      }
    });
  });

  describe('edge cases', () => {
    it('should ignore seconds and milliseconds', () => {
      const date = new Date(2025, 2, 15, 14, 30, 45, 123); // With seconds and ms
      const result = splitDateAndTime(date);

      expect(result.timeStr).toBe('14:30');
    });

    it('should handle leap year date', () => {
      const date = new Date(2024, 1, 29, 12, 0, 0, 0); // Feb 29, 2024
      const result = splitDateAndTime(date);

      expect(result.dateStr).toBe('2024-02-29');
    });
  });
});
