import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

const VALID_RESPONSES = ['accepted', 'declined'] as const;
type CostResponse = (typeof VALID_RESPONSES)[number];

/**
 * GET /api/release-notes/cost-response?version=x.y.z
 * Returns the current user's cost response for a specific version.
 * Accessible by any authenticated user.
 */
export async function GET(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const version = new URL(req.url).searchParams.get('version');
		if (!version) {
			return NextResponse.json(
				{ error: 'Missing version parameter' },
				{ status: 400 }
			);
		}

		const email = session.user?.email || '';

		const { data, error } = await supabaseAdmin
			.from('release_cost_responses')
			.select('response')
			.eq('version', version)
			.eq('user_email', email)
			.maybeSingle();

		if (error) {
			console.error('Error fetching cost response:', error);
			return NextResponse.json(
				{ error: 'Failed to fetch cost response' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ response: data?.response || null });
	} catch (error) {
		console.error('Cost response GET error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/release-notes/cost-response
 * Upserts a cost response for the current admin/developer user.
 * Body: { version: string, response: 'accepted' | 'declined' }
 */
export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!isAdmin(session)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await req.json();
		const { version, response } = body as {
			version: unknown;
			response: unknown;
		};

		if (!version || typeof version !== 'string') {
			return NextResponse.json(
				{ error: 'Invalid or missing version' },
				{ status: 400 }
			);
		}

		if (
			!response ||
			typeof response !== 'string' ||
			!VALID_RESPONSES.includes(response as CostResponse)
		) {
			return NextResponse.json(
				{ error: 'Invalid response, must be accepted or declined' },
				{ status: 400 }
			);
		}

		const email = session.user?.email || '';

		const { error } = await supabaseAdmin
			.from('release_cost_responses')
			.upsert(
				{
					version,
					user_email: email,
					response,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: 'version,user_email' }
			);

		if (error) {
			console.error('Error saving cost response:', error);
			return NextResponse.json(
				{ error: 'Failed to save cost response' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ version, response });
	} catch (error) {
		console.error('Cost response POST error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
