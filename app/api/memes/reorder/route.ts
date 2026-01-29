import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(req: NextRequest) {
	try {
		// Auth check
		const session = await getServerSession(authOptions);
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userRole = (session.user as { role?: string }).role;
		if (userRole !== 'admin' && userRole !== 'developer') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await req.json();
		const { updates } = body;

		if (!Array.isArray(updates) || updates.length === 0) {
			return NextResponse.json(
				{ error: 'Invalid updates array' },
				{ status: 400 },
			);
		}

		// Validate update structure
		for (const update of updates) {
			if (!update.id || typeof update.scheduledTime !== 'number') {
				return NextResponse.json(
					{ error: 'Each update must have id and scheduledTime' },
					{ status: 400 },
				);
			}
		}

		// Update all memes in a transaction-like batch
		const updatePromises = updates.map(
			(update) =>
				supabase
					.from('meme_submissions')
					.update({ scheduled_time: update.scheduledTime })
					.eq('id', update.id)
					.eq('status', 'scheduled'), // Only update if still scheduled
		);

		const results = await Promise.all(updatePromises);

		// Check for errors
		const errors = results.filter((result) => result.error);
		if (errors.length > 0) {
			console.error('Reorder errors:', errors);
			return NextResponse.json(
				{ error: 'Failed to update some memes', details: errors },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			updated: updates.length,
		});
	} catch (error) {
		console.error('Reorder error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
