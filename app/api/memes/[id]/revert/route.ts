import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { getUserId, requireAdmin } from '@/lib/auth-helpers';
import { preventWriteForDemo } from '@/lib/preview-guard';
import { Logger } from '@/lib/utils/logger';
import { createNotification } from '@/lib/notifications';
import { MemeStatus } from '@/lib/types';

const MODULE = 'api:memes:revert';

interface RouteParams {
	params: Promise<{ id: string }>;
}

/**
 * PATCH /api/memes/[id]/revert - Revert meme to pending status
 * Allows admin to undo a review decision (approve/reject).
 * Cannot revert published memes.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const session = await getServerSession(authOptions);
		requireAdmin(session);

		const demoGuard = preventWriteForDemo(session);
		if (demoGuard) return demoGuard;

		const { id } = await params;
		const adminId = getUserId(session);

		const { data: meme, error: fetchError } = await supabaseAdmin
			.from('meme_submissions')
			.select('id, user_id, user_email, media_url, storage_path, title, caption, status, rejection_reason, created_at, reviewed_at, reviewed_by, scheduled_time, scheduled_post_id, published_at, ig_media_id')
			.eq('id', id)
			.single();

		if (fetchError || !meme) {
			return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
		}

		const currentStatus = meme.status as MemeStatus;
		if (['published'].includes(currentStatus)) {
			return NextResponse.json(
				{ error: `Cannot revert meme that is already ${currentStatus}` },
				{ status: 400 },
			);
		}

		const { data: updated, error: updateError } = await supabaseAdmin
			.from('meme_submissions')
			.update({
				status: 'pending',
				reviewed_at: null,
				reviewed_by: null,
				rejection_reason: null,
				scheduled_time: null,
				scheduled_post_id: null,
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			Logger.error(
				MODULE,
				`Error reverting meme: ${updateError.message}`,
				updateError,
			);
			return NextResponse.json(
				{ error: 'Failed to revert meme' },
				{ status: 500 },
			);
		}

		await Logger.info(MODULE, `📝 Meme ${id} reverted to pending by admin`, {
			adminId,
		});

		// Notify user that their meme is under review again (optional, but good for clarity)
		await createNotification({
			userId: meme.user_id,
			type: 'system',
			title: 'Meme Status Update',
			message: `Your meme "${meme.title || 'Untitled'}" is being re-reviewed by our team.`,
			relatedType: 'meme',
			relatedId: id,
		});

		return NextResponse.json({ meme: updated });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Failed to revert meme';
		Logger.error(MODULE, `PATCH error: ${message}`, error);

		if (message === 'Admin access required') {
			return NextResponse.json({ error: message }, { status: 403 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}
