import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { preventWriteForDemo } from '@/lib/preview-guard';

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const userId = session.user.id;
		const body = await request.json();
		const { tourVersion } = body;

		if (!tourVersion || typeof tourVersion !== 'number') {
			return NextResponse.json({ error: 'Invalid tour version' }, { status: 400 });
		}

		// Upsert user preferences
		const { error } = await supabaseAdmin.from('user_preferences').upsert(
			{
				user_id: userId,
				tour_completed: true,
				tour_version: tourVersion,
				last_tour_date: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{
				onConflict: 'user_id',
			}
		);

		if (error) {
			console.error('Error saving tour completion:', error);
			return NextResponse.json({ error: 'Failed to save tour completion' }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Tour completion error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
