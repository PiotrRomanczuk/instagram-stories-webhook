import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
	removeAllowedUser,
	updateUserRole,
	UserRole,
	getAllowedUserByEmail,
	getUserStatsByEmail,
	getNextAuthUserIdByEmail,
} from '@/lib/memes-db';
import {
	requireAdmin,
	requireDeveloper,
	getUserId,
	getUserEmail,
} from '@/lib/auth-helpers';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { Logger } from '@/lib/utils/logger';
import {
	updateUserRoleSchema,
	validateUserInput,
} from '@/lib/validations/user.schema';

const MODULE = 'api:admin:users:[email]';

interface RouteParams {
	params: Promise<{ email: string }>;
}

/**
 * GET /api/admin/users/[email] - Get detailed user info
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getServerSession(authOptions);
		requireAdmin(session);

		const { email } = await params;
		const decodedEmail = decodeURIComponent(email).toLowerCase();

		// 1. Get whitelist info
		const user = await getAllowedUserByEmail(decodedEmail);
		if (!user) {
			return NextResponse.json(
				{ error: 'User not found in whitelist' },
				{ status: 404 },
			);
		}

		// 2. Get submission stats
		const stats = await getUserStatsByEmail(decodedEmail);

		// 3. Find User ID (Try NextAuth first, then fallback to stats)
		let userId = await getNextAuthUserIdByEmail(decodedEmail);

		if (!userId && stats.lastUserId) {
			userId = stats.lastUserId;
		}

		// 4. Get linked account info if we have a user_id
		let linkedAccount = null;
		if (userId) {
			linkedAccount = await getLinkedFacebookAccount(userId);
		}

		return NextResponse.json({
			user,
			stats,
			linkedAccount: linkedAccount
				? {
						provider: linkedAccount.provider,
						ig_user_id: linkedAccount.ig_user_id,
						ig_username: linkedAccount.ig_username,
						updated_at: linkedAccount.updated_at,
					}
				: null,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to fetch user details';
		Logger.error(MODULE, `GET error: ${message}`, error);

		if (message === 'Admin access required') {
			return NextResponse.json({ error: message }, { status: 403 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * PATCH /api/admin/users/[email] - Update user role
 * Body: { role: 'developer' | 'admin' | 'user' }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const { email } = await params;
		const decodedEmail = decodeURIComponent(email).toLowerCase();

		const body = await request.json();

		// Validate input with Zod schema
		const validation = await validateUserInput(updateUserRoleSchema, body);
		if (!validation.success) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		const { role } = validation.data;

		const success = await updateUserRole(decodedEmail, role as UserRole);

		if (!success) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		await Logger.info(MODULE, `🔄 Updated ${decodedEmail} role to ${role}`);

		return NextResponse.json({ success: true, email: decodedEmail, role });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to update user';
		Logger.error(MODULE, `PATCH error: ${message}`, error);

		if (message === 'Developer access required') {
			return NextResponse.json({ error: message }, { status: 403 });
		}

		// Handle last-developer protection error
		if (message.includes('last developer')) {
			return NextResponse.json({ error: message }, { status: 400 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * DELETE /api/admin/users/[email] - Remove user from whitelist
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getServerSession(authOptions);
		requireAdmin(session);

		const { email } = await params;
		const decodedEmail = decodeURIComponent(email).toLowerCase();
		const adminEmail = getUserEmail(session).toLowerCase();

		// Prevent admin from removing themselves
		if (decodedEmail === adminEmail) {
			return NextResponse.json(
				{ error: 'Cannot remove yourself from whitelist' },
				{ status: 400 },
			);
		}

		const success = await removeAllowedUser(decodedEmail);

		if (!success) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		await Logger.info(MODULE, `🗑️ Removed ${decodedEmail} from whitelist`, {
			removedBy: getUserId(session),
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to remove user';
		Logger.error(MODULE, `DELETE error: ${message}`, error);

		if (message === 'Admin access required') {
			return NextResponse.json({ error: message }, { status: 403 });
		}

		// Handle last-developer protection error
		if (message.includes('last developer')) {
			return NextResponse.json({ error: message }, { status: 400 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}
