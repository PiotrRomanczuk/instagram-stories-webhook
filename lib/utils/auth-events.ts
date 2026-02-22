import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from './logger';

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

/**
 * Records a sign-in attempt to the auth_events table.
 * Non-blocking: errors are logged but never thrown so they can't break auth.
 */
export async function recordAuthEvent(event: AuthEventPayload): Promise<void> {
	try {
		const { error } = await supabaseAdmin.from('auth_events').insert({
			email: event.email,
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
				{ email: event.email, outcome: event.outcome },
			);
		}
	} catch (err) {
		// Never let event recording break authentication
		await Logger.warn(MODULE, 'Exception recording auth event', err);
	}
}
