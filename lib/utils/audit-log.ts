import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from './logger';

const MODULE = 'audit-log';

export type AuditAction =
	| 'user.add'
	| 'user.remove'
	| 'user.role_change'
	| 'content.approve'
	| 'content.reject'
	| 'content.delete'
	| 'content.force_publish'
	| 'settings.publishing_toggle'
	| 'settings.auto_process_toggle';

export type AuditTargetType =
	| 'user'
	| 'content_item'
	| 'meme_submission'
	| 'setting';

export interface AuditEvent {
	actorUserId: string;
	actorEmail: string;
	action: AuditAction;
	targetType?: AuditTargetType;
	targetId?: string;
	targetEmail?: string;
	oldValue?: unknown;
	newValue?: unknown;
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Records an admin action to the admin_audit_log table.
 * Non-blocking: errors are logged but never thrown.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
	try {
		const { error } = await supabaseAdmin.from('admin_audit_log').insert({
			actor_user_id: event.actorUserId,
			actor_email: event.actorEmail,
			action: event.action,
			target_type: event.targetType ?? null,
			target_id: event.targetId ?? null,
			target_email: event.targetEmail ?? null,
			old_value: event.oldValue !== undefined ? event.oldValue : null,
			new_value: event.newValue !== undefined ? event.newValue : null,
			ip_address: event.ipAddress ?? null,
			user_agent: event.userAgent ?? null,
		});

		if (error) {
			await Logger.warn(MODULE, `Failed to record audit event: ${error.message}`, {
				action: event.action,
				actorEmail: event.actorEmail,
			});
		}
	} catch (err) {
		// Never let audit logging break the primary operation
		await Logger.warn(MODULE, 'Exception recording audit event', err);
	}
}

/**
 * Extracts IP address and user-agent from a Next.js request for audit context.
 */
export function getRequestContext(req: Request): {
	ipAddress: string | undefined;
	userAgent: string | undefined;
} {
	const forwarded = req.headers.get('x-forwarded-for');
	const ipAddress = forwarded ? forwarded.split(',')[0].trim() : undefined;
	const userAgent = req.headers.get('user-agent') ?? undefined;
	return { ipAddress, userAgent };
}
