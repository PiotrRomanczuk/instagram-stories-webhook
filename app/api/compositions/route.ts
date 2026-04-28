import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import { mapComposedVideoRow } from '@/lib/types/story-archive';
import type { ComposedVideoRow } from '@/lib/types/story-archive';
import type { UserRole } from '@/lib/types';

const MODULE = 'api:compositions';

export async function GET(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
	const role = (session.user as { role?: UserRole }).role;
	if (role !== 'admin' && role !== 'developer') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const { searchParams } = req.nextUrl;
	const limitRaw = Number(searchParams.get('limit') ?? '20');
	const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
	const status = searchParams.get('status');

	let query = supabaseAdmin
		.from('composed_videos')
		.select('*')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (status === 'completed') query = query.eq('composition_status', 'completed');
	if (status === 'failed') query = query.eq('composition_status', 'failed');
	if (status === 'published') query = query.eq('tiktok_publish_status', 'published');
	if (status === 'pending-publish')
		query = query.eq('composition_status', 'completed').eq('tiktok_publish_status', 'pending');

	const { data, error } = await query;
	if (error) {
		Logger.error(MODULE, `list error: ${error.message}`);
		return NextResponse.json({ error: 'Failed to load compositions' }, { status: 500 });
	}

	const videos = (data ?? []).map((row) => mapComposedVideoRow(row as ComposedVideoRow));
	return NextResponse.json({ videos });
}
