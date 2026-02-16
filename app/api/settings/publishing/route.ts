import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

/**
 * GET /api/settings/publishing
 * Returns the current publishing_enabled state.
 * Accessible to any authenticated user.
 */
export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from('system_settings')
		.select('value')
		.eq('key', 'publishing_enabled')
		.single();

	if (error) {
		return NextResponse.json({ error: 'Failed to read setting' }, { status: 500 });
	}

	return NextResponse.json({ enabled: data.value === 'true' });
}

/**
 * PATCH /api/settings/publishing
 * Toggles publishing on/off. Admin-only.
 * Body: { enabled: boolean }
 */
export async function PATCH(req: Request) {
	const session = await getServerSession(authOptions);
	if (!isAdmin(session)) {
		return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
	}

	const body = await req.json();
	const enabled = body.enabled === true;

	const { error } = await supabaseAdmin
		.from('system_settings')
		.update({
			value: enabled ? 'true' : 'false',
			updated_at: new Date().toISOString(),
			updated_by: session?.user?.email || 'unknown',
		})
		.eq('key', 'publishing_enabled');

	if (error) {
		return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
	}

	return NextResponse.json({ enabled });
}
