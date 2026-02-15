/**
 * Allowed users (email whitelist) query operations
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { Logger } from '../utils/logger';
import { UserRole, AllowedUser } from '../types';

const MODULE = 'db:memes';

export async function isEmailAllowed(email: string): Promise<boolean> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('email')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return false;
			Logger.error(
				MODULE,
				`Error checking allowed email: ${error.message}`,
				error,
			);
			return false;
		}

		return !!data;
	} catch (error) {
		Logger.error(MODULE, 'Exception in isEmailAllowed', error);
		return false;
	}
}

export async function getUserRole(email: string): Promise<UserRole | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('role')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(MODULE, `Error getting user role: ${error.message}`, error);
			return null;
		}

		return (data?.role as UserRole) || null;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getUserRole', error);
		return null;
	}
}

export async function getAllowedUserByEmail(
	email: string,
): Promise<AllowedUser | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('*')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(
				MODULE,
				`Error fetching allowed user: ${error.message}`,
				error,
			);
			return null;
		}

		return data as AllowedUser;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getAllowedUserByEmail', error);
		return null;
	}
}

export async function getNextAuthUserIdByEmail(
	email: string,
): Promise<string | null> {
	try {
		const { data, error } = await supabaseAdmin
			.schema('next_auth')
			.from('users')
			.select('id')
			.eq('email', email.toLowerCase())
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			Logger.error(
				MODULE,
				`Error fetching NextAuth user ID: ${error.message}`,
				error,
			);
			return null;
		}

		return data?.id || null;
	} catch (error) {
		Logger.error(MODULE, 'Exception in getNextAuthUserIdByEmail', error);
		return null;
	}
}

export async function getAllowedUsers(): Promise<AllowedUser[]> {
	try {
		const { data, error } = await supabaseAdmin
			.from('email_whitelist')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			Logger.error(
				MODULE,
				`Error fetching allowed users: ${error.message}`,
				error,
			);
			return [];
		}

		return data as AllowedUser[];
	} catch (error) {
		Logger.error(MODULE, 'Exception in getAllowedUsers', error);
		return [];
	}
}
