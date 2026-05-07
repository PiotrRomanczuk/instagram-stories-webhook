/**
 * Tests for recordAuthEvent (P1-4).
 *
 * Two security properties under test:
 *   1. Denied attempts MUST NOT store the plaintext email (would otherwise
 *      turn an auth_events table leak into an enumeration oracle).
 *   2. Repeated denied attempts for the same (provider, email) MUST be
 *      deduplicated within the window so an attacker can't flood the
 *      table with junk rows (DoS / storage exhaustion).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	recordAuthEvent,
	__resetAuthEventDedupe,
} from '@/lib/utils/auth-events';
import { hashEmail } from '@/lib/utils/hash';

const insertMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: () => ({ insert: insertMock }),
	},
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('recordAuthEvent', () => {
	beforeEach(() => {
		insertMock.mockClear();
		__resetAuthEventDedupe();
	});

	it('stores plaintext email for granted events (legitimate user)', async () => {
		await recordAuthEvent({
			email: 'real.user@example.com',
			provider: 'google',
			outcome: 'granted',
		});
		expect(insertMock).toHaveBeenCalledTimes(1);
		const row = insertMock.mock.calls[0][0];
		expect(row.email).toBe('real.user@example.com');
		expect(row.outcome).toBe('granted');
	});

	it('stores a sha256 hash (NOT plaintext) for denied events', async () => {
		const email = 'attacker.target@example.com';
		await recordAuthEvent({
			email,
			provider: 'google',
			outcome: 'denied',
			denyReason: 'not_in_whitelist',
		});

		expect(insertMock).toHaveBeenCalledTimes(1);
		const row = insertMock.mock.calls[0][0];
		expect(row.email).not.toBe(email);
		expect(row.email).not.toContain('attacker.target');
		expect(row.email).toBe(`sha256:${hashEmail(email)}`);
		expect(row.deny_reason).toBe('not_in_whitelist');
	});

	it('deduplicates repeated denied attempts for the same email+provider', async () => {
		const email = 'flood@example.com';
		for (let i = 0; i < 50; i++) {
			await recordAuthEvent({
				email,
				provider: 'google',
				outcome: 'denied',
			});
		}
		// Only the first attempt in the window is persisted.
		expect(insertMock).toHaveBeenCalledTimes(1);
	});

	it('does NOT throttle granted events (real signal)', async () => {
		const email = 'busy.user@example.com';
		for (let i = 0; i < 5; i++) {
			await recordAuthEvent({
				email,
				provider: 'google',
				outcome: 'granted',
			});
		}
		expect(insertMock).toHaveBeenCalledTimes(5);
	});

	it('treats different providers as independent dedupe buckets', async () => {
		const email = 'multiprovider@example.com';
		await recordAuthEvent({ email, provider: 'google', outcome: 'denied' });
		await recordAuthEvent({
			email,
			provider: 'test-credentials',
			outcome: 'denied',
		});
		expect(insertMock).toHaveBeenCalledTimes(2);
	});
});
