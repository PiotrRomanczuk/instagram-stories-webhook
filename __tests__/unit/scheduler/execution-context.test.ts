import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getAllLinkedAccounts,
	calculateDaysRemaining,
	isTokenExpired,
	isTokenExpiringSoon,
} from '@/lib/database/linked-accounts';
import { fetchUpcomingPosts } from '@/lib/content-db/queries';
import { Logger } from '@/lib/utils/logger';

describe('Cron Execution Context Helpers', () => {
	describe('Logger.maskToken', () => {
		it('should mask long tokens correctly', () => {
			const token = 'EAABsbCS1iHgBO12345678901234567890';
			const masked = Logger.maskToken(token);
			expect(masked).toBe('EAABsb...7890');
		});

		it('should mask short tokens', () => {
			const token = 'short';
			const masked = Logger.maskToken(token);
			expect(masked).toBe('***');
		});

		it('should handle null/undefined tokens', () => {
			expect(Logger.maskToken(null)).toBe('N/A');
			expect(Logger.maskToken(undefined)).toBe('N/A');
		});
	});

	describe('calculateDaysRemaining', () => {
		it('should calculate positive days remaining', () => {
			const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
			const days = calculateDaysRemaining(tomorrow);
			expect(days).toBe(1);
		});

		it('should calculate negative days for expired tokens', () => {
			const yesterday = Date.now() - 24 * 60 * 60 * 1000;
			const days = calculateDaysRemaining(yesterday);
			expect(days).toBe(-1);
		});

		it('should handle undefined expiry', () => {
			const days = calculateDaysRemaining(undefined);
			expect(days).toBe(-1);
		});
	});

	describe('isTokenExpired', () => {
		it('should return true for expired tokens', () => {
			const yesterday = Date.now() - 24 * 60 * 60 * 1000;
			expect(isTokenExpired(yesterday)).toBe(true);
		});

		it('should return false for valid tokens', () => {
			const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
			expect(isTokenExpired(tomorrow)).toBe(false);
		});

		it('should return true for undefined expiry', () => {
			expect(isTokenExpired(undefined)).toBe(true);
		});
	});

	describe('isTokenExpiringSoon', () => {
		it('should return true for tokens expiring within 7 days', () => {
			const fiveDaysFromNow = Date.now() + 5 * 24 * 60 * 60 * 1000;
			expect(isTokenExpiringSoon(fiveDaysFromNow)).toBe(true);
		});

		it('should return false for tokens expiring after 7 days', () => {
			const tenDaysFromNow = Date.now() + 10 * 24 * 60 * 60 * 1000;
			expect(isTokenExpiringSoon(tenDaysFromNow)).toBe(false);
		});

		it('should return false for expired tokens', () => {
			const yesterday = Date.now() - 24 * 60 * 60 * 1000;
			expect(isTokenExpiringSoon(yesterday)).toBe(false);
		});

		it('should return false for undefined expiry', () => {
			expect(isTokenExpiringSoon(undefined)).toBe(false);
		});
	});
});
