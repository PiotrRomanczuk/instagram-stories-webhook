import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllowedUsers, addAllowedUser, UserRole } from '@/lib/memes-db';
import { requireAdmin, requireDeveloper, getUserId, isDeveloper } from '@/lib/auth-helpers';
import { Logger } from '@/lib/utils/logger';
import { addUserSchema, validateUserInput } from '@/lib/validations/user.schema';

const MODULE = 'api:users';

/**
 * GET /api/users - List all whitelisted users
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
 * POST /api/users - Add user to whitelist
 * Body: { email: string, role?: 'developer' | 'admin' | 'user', display_name?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        requireAdmin(session);

        const adminId = getUserId(session);
        const body = await request.json();

        // Validate input with Zod schema
        const validation = await validateUserInput(addUserSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { email, role, display_name } = validation.data;

        // Prevent admins from creating developers
        if (role === 'developer' && !isDeveloper(session)) {
            return NextResponse.json({ error: 'Only developers can create developer accounts' }, { status: 403 });
        }

        const user = await addAllowedUser({
            email,
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

        await Logger.info(MODULE, `Added ${email} to whitelist as ${role}`, { addedBy: adminId });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add user';
        Logger.error(MODULE, `POST error: ${message}`, error);

        if (message === 'Admin access required' || message === 'Developer access required') {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
