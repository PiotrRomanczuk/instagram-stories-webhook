/**
 * Allowed users management (add/remove/update role)
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';
import { UserRole, AllowedUser } from '../types';

const MODULE = 'db:memes';

export async function addAllowedUser(
	user: Omit<AllowedUser, 'id' | 'created_at'>,
): Promise<AllowedUser | null> {
	try {
		Logger.info(MODULE, `Attempting to add user ${user.email} with role ${user.role} by ${user.added_by}`);
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.insert({
				email: user.email.toLowerCase(),
				role: user.role,
			})
			.select()
			.single();

		if (error) {
			Logger.error(
				MODULE,
				`Error adding allowed user: ${error.message} (Code: ${error.code}, Details: ${error.details}, Hint: ${error.hint})`,
				error,
			);
			// Throw the specific error instead of returning null so the API route can handle it
			throw new Error(`DB Error: ${error.message} (${error.code})`);
		}

		Logger.info(MODULE, `Added ${user.email} to whitelist as ${user.role}`);
		return data as AllowedUser;
	} catch (error) {
		Logger.error(MODULE, 'Exception in addAllowedUser', error);
		if (error instanceof Error && error.message.includes('DB Error')) {
			throw error;
		}
		return null;
	}
}

export async function removeAllowedUser(email: string): Promise<boolean> {
	try {
		const { data: targetUser } = await supabaseAdmin
			.from('email_whitelist')
			.select('role')
			.eq('email', email.toLowerCase())
			.single();

		if (targetUser?.role === 'developer') {
			const { data: developers, error: countError } = await supabaseAdmin
				.from('email_whitelist')
				.select('id')
				.eq('role', 'developer');

			if (countError) {
				Logger.error(
					MODULE,
					`Error counting developers: ${countError.message}`,
					countError,
				);
				return false;
			}

			if (developers && developers.length === 1) {
				Logger.error(MODULE, `Cannot remove ${email} - last developer`, {
					email,
				});
				throw new Error(
					'Cannot remove the last developer - system lockout protection',
				);
			}
		}

		const { error } = await supabaseAdmin
			.from('email_whitelist')
			.delete()
			.eq('email', email.toLowerCase());

		if (error) {
			Logger.error(
				MODULE,
				`Error removing allowed user: ${error.message}`,
				error,
			);
			return false;
		}

		Logger.info(MODULE, `Removed ${email} from whitelist`);
		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in removeAllowedUser', error);
		if (error instanceof Error && error.message.includes('last developer')) {
			throw error;
		}
		return false;
	}
}

export async function updateUserRole(
	email: string,
	role: UserRole,
): Promise<boolean> {
	try {
		if (role !== 'developer') {
			const { data: currentUser } = await supabaseAdmin
				.from('email_whitelist')
				.select('role')
				.eq('email', email.toLowerCase())
				.single();

			if (currentUser?.role === 'developer') {
				const { data: developers, error: countError } = await supabaseAdmin
					.from('email_whitelist')
					.select('id')
					.eq('role', 'developer');

				if (countError) {
					Logger.error(
						MODULE,
						`Error counting developers: ${countError.message}`,
						countError,
					);
					return false;
				}

				if (developers && developers.length === 1) {
					Logger.error(MODULE, `Cannot demote ${email} - last developer`, {
						email,
						attemptedRole: role,
					});
					throw new Error(
						'Cannot demote the last developer - system lockout protection',
					);
				}
			}
		}

		const { error } = await supabaseAdmin
			.from('email_whitelist')
			.update({ role })
			.eq('email', email.toLowerCase());

		if (error) {
			Logger.error(MODULE, `Error updating user role: ${error.message}`, error);
			return false;
		}

		Logger.info(MODULE, `Updated ${email} role to ${role}`);
		return true;
	} catch (error) {
		Logger.error(MODULE, 'Exception in updateUserRole', error);
		if (error instanceof Error && error.message.includes('last developer')) {
			throw error;
		}
		return false;
	}
}
