/**
 * Bulk Test Data Cleanup API
 *
 * DELETE /api/test/cleanup - Remove all test content matching E2E test patterns
 *
 * Security:
 * - Only works in preview or development environments (blocks production)
 * - Requires authenticated session with admin or developer role
 * - Uses supabaseAdmin for deletion to bypass RLS
 *
 * Deletion Patterns:
 * - Title starts with [E2E-TEST]
 * - Caption contains #e2e-test
 * - Legacy patterns: "E2E Critical Path", "CP-", "Test Content", "Scheduled Content"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getCurrentEnvironment } from '@/lib/content-db/environment';

export async function DELETE(req: NextRequest) {
	try {
		// 1. Environment guard: Only allow in preview or development
		const environment = getCurrentEnvironment();
		if (environment === 'production') {
			return NextResponse.json(
				{
					error: 'Cleanup endpoint is disabled in production',
					environment
				},
				{ status: 403 }
			);
		}

		// 2. Auth check: Require admin or developer role
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const role = getUserRole(session);
		if (role !== 'admin' && role !== 'developer') {
			return NextResponse.json(
				{ error: 'Only admins and developers can clean up test data' },
				{ status: 403 }
			);
		}

		// 3. Delete all content matching test patterns
		const { data, error } = await supabaseAdmin
			.from('content_items')
			.delete()
			.eq('environment', environment)
			.or(
				'title.ilike.%[E2E-TEST]%,' +
				'caption.ilike.%#e2e-test%,' +
				'title.ilike.%E2E Critical Path%,' +
				'title.ilike.%CP-%,' +
				'title.ilike.%Test Content%,' +
				'title.ilike.%Scheduled Content%'
			)
			.select('id');

		if (error) {
			console.error('Failed to delete test content:', error);
			return NextResponse.json(
				{ error: 'Failed to delete test content', details: error.message },
				{ status: 500 }
			);
		}

		const deletedCount = data?.length || 0;

		console.log(`🧹 Cleanup: Deleted ${deletedCount} test items from ${environment} environment`);

		return NextResponse.json({
			deleted: deletedCount,
			environment,
			message: `Deleted ${deletedCount} test items from ${environment} environment`,
		});

	} catch (error) {
		console.error('Cleanup endpoint error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
