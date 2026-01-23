import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllowedUsers, addAllowedUser, UserRole } from '@/lib/memes-db';
import { requireAdmin, getUserId } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:admin:users';

/**
 * GET /api/admin/users - List all whitelisted users
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        requireAdmin(session);

        const users = await getAllowedUsers();

        return NextResponse.json({ users });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch users';
        Logger.error(MODULE, `GET error: ${message}`, error);

        if (message === 'Admin access required') {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * POST /api/admin/users - Add user to whitelist
 * Body: { email: string, role?: 'developer' | 'admin' | 'user', display_name?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        requireAdmin(session);

        const adminId = getUserId(session);
        const body = await request.json();
        const { email, role = 'user', display_name } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'email is required' }, { status: 400 });
        }

        if (role && !['developer', 'admin', 'user'].includes(role)) {
            return NextResponse.json(
                { error: "role must be 'developer', 'admin', or 'user'" },
                { status: 400 }
            );
        }

        const user = await addAllowedUser({
            email: email.toLowerCase().trim(),
            role: role as UserRole,
            display_name,
            added_by: adminId
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Failed to add user (may already exist)' },
                { status: 400 }
            );
        }

        await Logger.info(MODULE, `✅ Added ${email} to whitelist as ${role}`, { addedBy: adminId });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add user';
        Logger.error(MODULE, `POST error: ${message}`, error);

        if (message === 'Admin access required') {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
