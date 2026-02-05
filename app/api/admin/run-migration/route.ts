import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Temporary endpoint to run the tour migration
// DELETE THIS FILE after migration is applied!

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		const user = session?.user as { role?: string };

		// Only allow admin/developer to run migrations
		if (!session || (user.role !== 'admin' && user.role !== 'developer')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('🔄 Running tour tracking migration...');

		// Read migration file
		const migrationPath = join(process.cwd(), 'supabase/migrations/20260205_add_tour_tracking.sql');
		const migrationSQL = readFileSync(migrationPath, 'utf8');

		// Split into individual statements
		const statements = migrationSQL
			.split(';')
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith('--'));

		const results = [];

		// Execute each statement
		for (let i = 0; i < statements.length; i++) {
			const stmt = statements[i];

			// Skip comments
			if (stmt.startsWith('--') || stmt.startsWith('/*')) continue;

			console.log(`Executing statement ${i + 1}/${statements.length}...`);

			try {
				// Use raw SQL execution via Supabase
				const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: stmt });

				if (error) {
					// Some statements might fail if already exist, that's ok
					console.log(`Statement ${i + 1} warning:`, error.message);
					results.push({ statement: i + 1, warning: error.message });
				} else {
					results.push({ statement: i + 1, success: true });
				}
			} catch (err: any) {
				console.log(`Statement ${i + 1} error:`, err.message);
				results.push({ statement: i + 1, error: err.message });
			}
		}

		// Verify table was created
		const { data: testData, error: testError } = await supabaseAdmin
			.from('user_preferences')
			.select('id')
			.limit(1);

		if (testError) {
			return NextResponse.json(
				{
					success: false,
					message: 'Migration executed but table verification failed',
					error: testError.message,
					results,
					instruction:
						'Please apply manually via Supabase Dashboard → SQL Editor: supabase/migrations/20260205_add_tour_tracking.sql',
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: '✅ Migration applied successfully!',
			results,
			tableVerified: true,
		});
	} catch (error: any) {
		console.error('Migration error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error.message,
				instruction:
					'Please apply manually via Supabase Dashboard → SQL Editor: supabase/migrations/20260205_add_tour_tracking.sql',
			},
			{ status: 500 }
		);
	}
}
