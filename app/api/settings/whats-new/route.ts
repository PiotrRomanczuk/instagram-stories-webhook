import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isDeveloper } from '@/lib/auth-helpers';
import {
	getSystemSetting,
	setSystemSetting,
	SETTING_KEYS,
} from '@/lib/supabase/system-settings';
import {
	parseWhatsNewConfig,
	DEFAULT_CONFIG,
	type AudienceType,
} from '@/lib/release-notes/release-notes-config';

const VALID_AUDIENCE_TYPES: AudienceType[] = ['all', 'admin', 'developer'];

/**
 * GET /api/settings/whats-new
 * Returns the current What's New targeting config.
 * Accessible to any authenticated user.
 */
export async function GET() {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const raw = await getSystemSetting(
		SETTING_KEYS.WHATS_NEW_CONFIG,
		JSON.stringify(DEFAULT_CONFIG)
	);
	const config = parseWhatsNewConfig(raw);

	return NextResponse.json({
		audienceType: config.audienceType,
		targetEmails: config.targetEmails,
	});
}

/**
 * PATCH /api/settings/whats-new
 * Updates the What's New targeting config. Developer-only.
 * Body: { audienceType: AudienceType, targetEmails: string[] }
 */
export async function PATCH(req: Request) {
	const session = await getServerSession(authOptions);
	if (!isDeveloper(session)) {
		return NextResponse.json(
			{ error: 'Developer access required' },
			{ status: 403 }
		);
	}

	const body = await req.json();
	const { audienceType, targetEmails } = body;

	if (!VALID_AUDIENCE_TYPES.includes(audienceType)) {
		return NextResponse.json(
			{ error: `Invalid audienceType. Must be one of: ${VALID_AUDIENCE_TYPES.join(', ')}` },
			{ status: 400 }
		);
	}

	if (!Array.isArray(targetEmails) || !targetEmails.every((e: unknown) => typeof e === 'string')) {
		return NextResponse.json(
			{ error: 'targetEmails must be an array of strings' },
			{ status: 400 }
		);
	}

	try {
		await setSystemSetting(
			SETTING_KEYS.WHATS_NEW_CONFIG,
			JSON.stringify({ audienceType, targetEmails }),
			session?.user?.email || 'unknown'
		);
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Failed to update setting';
		return NextResponse.json({ error: message }, { status: 500 });
	}

	return NextResponse.json({ audienceType, targetEmails });
}
