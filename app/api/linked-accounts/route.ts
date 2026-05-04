import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:linked-accounts';

export const dynamic = 'force-dynamic';

const PROVIDERS = ['facebook', 'tiktok'] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: string): value is Provider {
    return (PROVIDERS as readonly string[]).includes(value);
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from('linked_accounts')
        .select('provider, ig_username, provider_account_id, expires_at, refresh_expires_at, created_at, updated_at')
        .eq('user_id', session.user.id);

    if (error) {
        Logger.error(MODULE, `list error: ${error.message}`);
        return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 });
    }

    return NextResponse.json({ accounts: data ?? [] });
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const provider = req.nextUrl.searchParams.get('provider');
    if (!provider || !isProvider(provider)) {
        return NextResponse.json(
            { error: `provider must be one of: ${PROVIDERS.join(', ')}` },
            { status: 400 },
        );
    }

    const userId = session.user.id;
    const { error } = await supabaseAdmin
        .from('linked_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

    if (error) {
        Logger.error(MODULE, `delete error: ${error.message}`);
        return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
    }

    Logger.info(MODULE, `Disconnected ${provider} for user ${userId}`);
    return NextResponse.json({ success: true, provider });
}
