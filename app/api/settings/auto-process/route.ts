import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import {
	getBooleanSetting,
	setSystemSetting,
	SETTING_KEYS,
} from '@/lib/supabase/system-settings';

/**
 * GET /api/settings/auto-process
 * Returns whether auto-processing is enabled.
 * Accessible to any authenticated user.
 */
export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const enabled = await getBooleanSetting(
		SETTING_KEYS.AUTO_PROCESS_VIDEOS,
		true // default to enabled
	);

	return NextResponse.json({ enabled });
}

/**
 * PATCH /api/settings/auto-process
 * Toggles auto-processing on/off. Admin-only.
 * Body: { enabled: boolean }
 */
export async function PATCH(req: Request) {
	const session = await getServerSession(authOptions);
	if (!isAdmin(session)) {
		return NextResponse.json(
			{ error: 'Admin access required' },
			{ status: 403 }
		);
	}

	const body = await req.json();
	const enabled = body.enabled === true;

	try {
		await setSystemSetting(
			SETTING_KEYS.AUTO_PROCESS_VIDEOS,
			enabled ? 'true' : 'false',
			session?.user?.email || 'unknown'
		);
	} catch {
		return NextResponse.json(
			{ error: 'Failed to update setting' },
			{ status: 500 }
		);
	}

	return NextResponse.json({ enabled });
}
