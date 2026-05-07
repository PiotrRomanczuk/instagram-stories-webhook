import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from './logger';
import { hashEmail } from './hash';

const MODULE = 'auth-events';

export interface AuthEventPayload {
	email: string;
	provider: string;
	outcome: 'granted' | 'denied';
	denyReason?: string;
	role?: string;
	ipAddress?: string;
	userAgent?: string;
}

// In-memory dedupe / write-throttle for denied events.
// Goal (P1-4): an attacker who repeatedly POSTs failed sign-ins for the same
// email cannot flood the auth_events table with junk rows. The first denial
// in a window is recorded; subsequent denials for the same hashed email +
// provider are silently dropped within the window. Granted events are never
// throttled — those are real signal.
const DENIED_DEDUPE_WINDOW_MS = 60_000;
const DENIED_DEDUPE_MAX_KEYS = 5_000; // hard cap to prevent memory growth
const deniedRecentlyAt = new Map<string, number>();

function shouldRecordDenied(emailHash: string, provider: string): boolean {
	const now = Date.now();
	const key = `${provider}:${emailHash}`;

	// Cheap LRU-ish cleanup: when we hit the cap, drop expired entries.
	if (deniedRecentlyAt.size >= DENIED_DEDUPE_MAX_KEYS) {
		for (const [k, ts] of deniedRecentlyAt) {
			if (now - ts > DENIED_DEDUPE_WINDOW_MS) deniedRecentlyAt.delete(k);
		}
	}

	const last = deniedRecentlyAt.get(key);
	if (last && now - last < DENIED_DEDUPE_WINDOW_MS) {
		return false;
	}
	deniedRecentlyAt.set(key, now);
	return true;
}

/**
 * Records a sign-in attempt to the auth_events table.
 *
 * SECURITY (P1-4):
 * - For `outcome === 'denied'` we store a SHA-256 hash of the email instead
 *   of the plaintext value, so an `auth_events` table leak cannot be used
 *   as an enumeration oracle to learn which emails have tried to sign in.
 * - Denied events for the same (provider, email-hash) are deduplicated
 *   within a 60s window to prevent attackers from flooding the table with
 *   junk rows (DoS / storage exhaustion).
 *
 * Non-blocking: errors are logged but never thrown so they can't break auth.
 */
export async function recordAuthEvent(event: AuthEventPayload): Promise<void> {
	try {
		const isDenied = event.outcome === 'denied';

		// For denied events, replace plaintext email with a stable hash.
		const storedEmail = isDenied
			? `sha256:${hashEmail(event.email)}`
			: event.email;

		if (isDenied && !shouldRecordDenied(hashEmail(event.email), event.provider)) {
			// Throttled — don't write; this is by design (P1-4).
			return;
		}

		const { error } = await supabaseAdmin.from('auth_events').insert({
			email: storedEmail,
			provider: event.provider,
			outcome: event.outcome,
			deny_reason: event.denyReason ?? null,
			role: event.role ?? null,
			ip_address: event.ipAddress ?? null,
			user_agent: event.userAgent ?? null,
		});

		if (error) {
			await Logger.warn(
				MODULE,
				`Failed to record auth event: ${error.message}`,
				// Never log the plaintext email here — only the outcome.
				{ outcome: event.outcome, provider: event.provider },
			);
		}
	} catch (err) {
		// Never let event recording break authentication
		await Logger.warn(MODULE, 'Exception recording auth event', err);
	}
}

/** Test-only helper. */
export function __resetAuthEventDedupe(): void {
	deniedRecentlyAt.clear();
}
