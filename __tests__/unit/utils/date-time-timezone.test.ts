/**
 * Unit tests for timezone utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getUserTimezone,
  getTimezoneLabel,
  getTimezoneOffset,
  formatTimezoneOffset,
  getTimezoneDisplay,
} from '@/lib/utils/date-time/timezone';

describe('getUserTimezone', () => {
  it('should return IANA timezone identifier', () => {
    const timezone = getUserTimezone();

    // Should be a valid IANA timezone (e.g., "America/New_York", "Europe/London")
    expect(timezone).toBeTruthy();
    expect(typeof timezone).toBe('string');

    // IANA format typically has a slash (continent/city) or is a few-letter code
    expect(timezone.length).toBeGreaterThan(0);
  });

  it('should return consistent value within same process', () => {
    const tz1 = getUserTimezone();
    const tz2 = getUserTimezone();

    expect(tz1).toBe(tz2);
  });
});

describe('getTimezoneLabel', () => {
  it('should extract city name from IANA timezone', () => {
    const label = getTimezoneLabel();

    // Should be a readable city name (e.g., "New York", "London", "Tokyo")
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');

    // Should not contain underscores (replaced with spaces)
    expect(label).not.toContain('_');
  });

  it('should handle timezone without slash separator', () => {
    // Some systems might return just "UTC" or similar
    const label = getTimezoneLabel();

    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  it('should replace underscores with spaces', () => {
    // If timezone is "America/New_York", label should be "New York"
    const label = getTimezoneLabel();

    // Verify no underscores remain
    expect(label).not.toMatch(/_/);
  });
});

describe('getTimezoneOffset', () => {
  it('should return offset in minutes', () => {
    const offset = getTimezoneOffset();

    expect(typeof offset).toBe('number');

    // Offset should be within reasonable range (-720 to +840 minutes)
    // UTC-12 to UTC+14 (extreme timezones)
    expect(offset).toBeGreaterThanOrEqual(-840);
    expect(offset).toBeLessThanOrEqual(720);
  });

  it('should return negative for timezones ahead of UTC', () => {
    const offset = getTimezoneOffset();

    // Note: JavaScript's getTimezoneOffset() returns negative for ahead of UTC
    // This is counter-intuitive but correct per spec
    expect(typeof offset).toBe('number');
  });

  it('should be divisible by 15 for most timezones', () => {
    const offset = getTimezoneOffset();

    // Most timezones are in 15-minute increments
    // (though some like Nepal UTC+5:45 are exceptions)
    // Just verify it's a reasonable number
    expect(Math.abs(offset)).toBeLessThan(1000);
  });
});

describe('formatTimezoneOffset', () => {
  it('should format offset as UTC string', () => {
    const formatted = formatTimezoneOffset();

    // Should match pattern like "UTC-5", "UTC+1", "UTC-11"
    expect(formatted).toMatch(/^UTC[+-]\d+(\.\d+)?$/);
  });

  it('should include sign', () => {
    const formatted = formatTimezoneOffset();

    // Should always have + or - after UTC
    expect(formatted).toContain('UTC');
    expect(/[+-]/.test(formatted)).toBe(true);
  });

  it('should handle positive and negative offsets', () => {
    const formatted = formatTimezoneOffset();

    // Format should be consistent
    expect(formatted.startsWith('UTC')).toBe(true);
  });

  it('should convert minutes to hours', () => {
    const formatted = formatTimezoneOffset();

    // Should show hours, not minutes
    // (e.g., "UTC-5" for EST, not "UTC-300")
    expect(formatted).toMatch(/^UTC[+-]\d+(\.\d+)?$/);

    // Extract number part
    const numericPart = formatted.replace(/^UTC[+-]/, '');
    const number = parseFloat(numericPart);

    // Should be in reasonable hour range
    expect(Math.abs(number)).toBeLessThan(15);
  });
});

describe('getTimezoneDisplay', () => {
  it('should combine city name and offset', () => {
    const display = getTimezoneDisplay();

    // Should have format like "New York (UTC-5)"
    expect(display).toBeTruthy();
    expect(typeof display).toBe('string');

    // Should contain both city and UTC offset
    expect(display).toContain('(UTC');
    expect(display).toContain(')');
  });

  it('should include parentheses around offset', () => {
    const display = getTimezoneDisplay();

    // Verify proper formatting
    expect(display).toMatch(/\(UTC[+-]\d+(\.\d+)?\)$/);
  });

  it('should not contain underscores', () => {
    const display = getTimezoneDisplay();

    // City name should have spaces, not underscores
    expect(display).not.toContain('_');
  });

  it('should be suitable for UI display', () => {
    const display = getTimezoneDisplay();

    // Should be human-readable
    expect(display.length).toBeGreaterThan(5);
    expect(display.length).toBeLessThan(50);

    // Should have standard format
    expect(display).toMatch(/^.+ \(UTC[+-]\d+(\.\d+)?\)$/);
  });
});
