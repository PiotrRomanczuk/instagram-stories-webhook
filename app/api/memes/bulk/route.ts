import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getUserId, requireAdmin } from '@/lib/auth-helpers';
import { preventWriteForDemo } from '@/lib/preview-guard';
import { Logger } from '@/lib/utils/logger';
import { createNotification } from '@/lib/notifications';

const MODULE = 'api:memes:bulk';

/**
 * POST /api/memes/bulk - Bulk review memes (approve/reject)
 * Uses a single transaction for atomicity
 */
export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		requireAdmin(session);

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const adminId = getUserId(session);
		const { ids, action, rejectionReason } = await req.json();

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json(
				{ error: 'No meme IDs provided' },
				{ status: 400 },
			);
		}

		if (!['approve', 'reject'].includes(action)) {
			return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
		}

		Logger.info(
			MODULE,
			`Bulk ${action} for ${ids.length} memes by admin ${adminId}`,
		);

		// We use RPC for atomic bulk operations if we have one,
		// otherwise we use a single update call which is atomic for the set
		const status = action === 'approve' ? 'approved' : 'rejected';

		// Fetch all memes first to get user IDs for notifications
		const { data: memes, error: fetchError } = await supabaseAdmin
			.from('meme_submissions')
			.select('id, user_id, title')
			.in('id', ids);

		if (fetchError) throw fetchError;

		// Perform bulk update
		const { error: updateError } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status: status,
				reviewed_at: new Date().toISOString(),
				reviewed_by: adminId,
				rejection_reason: action === 'reject' ? rejectionReason : null,
			})
			.in('id', ids);

		if (updateError) {
			Logger.error(
				MODULE,
				`Bulk update failed: ${updateError.message}`,
				updateError,
			);
			return NextResponse.json(
				{ error: 'Failed to update memes' },
				{ status: 500 },
			);
		}

		// Send notifications in parallel
		if (memes) {
			await Promise.allSettled(
				memes.map((meme) =>
					createNotification({
						userId: meme.user_id,
						type: action === 'approve' ? 'meme_approved' : 'meme_rejected',
						title:
							action === 'approve' ? '🎉 Meme Approved!' : '❌ Meme Rejected',
						message:
							action === 'approve'
								? `Your meme "${meme.title || 'Untitled'}" was approved in periodic review!`
								: `Your meme was rejected: ${rejectionReason}`,
						relatedType: 'meme',
						relatedId: meme.id,
					}),
				),
			);
		}

		return NextResponse.json({
			success: true,
			count: ids.length,
			status,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Internal Server Error';
		Logger.error(MODULE, `POST error: ${message}`, error);

		if (message === 'Admin access required') {
			return NextResponse.json({ error: message }, { status: 403 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}
