import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = session.user.id;

		// Fetch user preferences
		const { data, error } = await supabaseAdmin
			.from('user_preferences')
			.select('tour_completed, tour_version, last_tour_date')
			.eq('user_id', userId)
			.single();

		if (error) {
			// If no record exists, return null (first time user)
			if (error.code === 'PGRST116') {
				return NextResponse.json({ status: null });
			}
			console.error('Error fetching tour status:', error);
			return NextResponse.json({ error: 'Failed to fetch tour status' }, { status: 500 });
		}

		return NextResponse.json({
			status: {
				tourCompleted: data.tour_completed,
				tourVersion: data.tour_version,
				lastTourDate: data.last_tour_date,
			},
		});
	} catch (error) {
		console.error('Tour status error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
