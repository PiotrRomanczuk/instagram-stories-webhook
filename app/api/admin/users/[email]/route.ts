import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { removeAllowedUser, updateUserRole, UserRole } from '@/lib/memes-db';
import { requireAdmin, requireDeveloper, getUserId, getUserEmail } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:admin:users:[email]';

interface RouteParams {
    params: Promise<{ email: string }>;
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
        const { role } = body;

        if (!role || !['developer', 'admin', 'user'].includes(role)) {
            return NextResponse.json(
                { error: "role must be 'developer', 'admin', or 'user'" },
                { status: 400 }
            );
        }

        const success = await updateUserRole(decodedEmail, role as UserRole);

        if (!success) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await Logger.info(MODULE, `🔄 Updated ${decodedEmail} role to ${role}`);

        return NextResponse.json({ success: true, email: decodedEmail, role });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update user';
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
                { status: 400 }
            );
        }

        const success = await removeAllowedUser(decodedEmail);

        if (!success) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await Logger.info(MODULE, `🗑️ Removed ${decodedEmail} from whitelist`, {
            removedBy: getUserId(session)
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove user';
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
