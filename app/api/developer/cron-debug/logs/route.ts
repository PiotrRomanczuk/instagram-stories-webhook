import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireDeveloper } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireDeveloper(session);

		const { searchParams } = new URL(req.url);
		const type = searchParams.get('type') || 'system';
		const logModule = searchParams.get('module') || 'cron';
		const hours = parseInt(searchParams.get('hours') || '1');
		const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
		const offset = parseInt(searchParams.get('offset') || '0');

		const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

		if (type === 'system') {
			// Fetch system logs
			const { data: logs, error, count } = await supabaseAdmin
				.from('system_logs')
				.select('id, level, module, message, details, created_at', { count: 'exact' })
				.ilike('module', `%${logModule}%`)
				.gte('created_at', hoursAgo.toISOString())
				.order('created_at', { ascending: false })
				.range(offset, offset + limit - 1);

			if (error) throw error;

			return NextResponse.json({
				logs: logs || [],
				total: count || 0,
				type: 'system',
			});
		} else if (type === 'publishing') {
			// Fetch publishing logs
			const { data: logs, error, count } = await supabaseAdmin
				.from('publishing_logs')
				.select('id, status, ig_media_id, error_message, created_at, user_id, media_type, post_type', { count: 'exact' })
				.gte('created_at', hoursAgo.toISOString())
				.order('created_at', { ascending: false })
				.range(offset, offset + limit - 1);

			if (error) throw error;

			return NextResponse.json({
				logs: logs || [],
				total: count || 0,
				type: 'publishing',
			});
		} else {
			return NextResponse.json(
				{ error: 'Invalid log type. Must be "system" or "publishing".' },
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error('Error fetching logs:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch logs' },
			{ status: 500 },
		);
	}
}
