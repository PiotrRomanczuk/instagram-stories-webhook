/**
 * GET /api/media/processing-status/[id]
 *
 * Returns the current processing status of a content item.
 * Used for polling during Railway video processing to show real-time progress.
 *
 * Response:
 * - status: ProcessingStatus (pending/processing/completed/failed)
 * - backend: ProcessingBackend (browser/railway/server-ffmpeg/none)
 * - elapsedMs: number (time since processing started)
 * - processingApplied: string[] (transformations applied)
 * - error?: string (if status is failed)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';
import type { ProcessingStatus, ProcessingBackend } from '@/lib/types/common';

const MODULE = 'api/processing-status';

interface ProcessingStatusResponse {
	id: string;
	status: ProcessingStatus;
	backend?: ProcessingBackend;
	elapsedMs?: number;
	processingApplied?: string[];
	error?: string;
	storyReady: boolean;
	startedAt?: string;
	completedAt?: string;
}

export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> }
): Promise<NextResponse<ProcessingStatusResponse | { error: string }>> {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await context.params;

		if (!id) {
			return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
		}

		// Fetch content item with processing status
		const { data: item, error } = await supabaseAdmin
			.from('content_items')
			.select(
				'id, processing_status, processing_backend, processing_started_at, processing_completed_at, processing_error, processing_applied, story_ready'
			)
			.eq('id', id)
			.single();

		if (error || !item) {
			await Logger.warn(MODULE, `Content item not found: ${id}`, error);
			return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
		}

		const status = (item.processing_status as ProcessingStatus) || 'pending';
		const backend = item.processing_backend as ProcessingBackend | undefined;
		const storyReady = item.story_ready || false;

		// Calculate elapsed time if processing is in progress
		let elapsedMs: number | undefined;
		if (status === 'processing' && item.processing_started_at) {
			const startTime = new Date(item.processing_started_at).getTime();
			elapsedMs = Date.now() - startTime;
		} else if ((status === 'completed' || status === 'failed') && item.processing_started_at && item.processing_completed_at) {
			const startTime = new Date(item.processing_started_at).getTime();
			const endTime = new Date(item.processing_completed_at).getTime();
			elapsedMs = endTime - startTime;
		}

		const response: ProcessingStatusResponse = {
			id: item.id,
			status,
			backend,
			elapsedMs,
			processingApplied: item.processing_applied || [],
			error: item.processing_error || undefined,
			storyReady,
			startedAt: item.processing_started_at || undefined,
			completedAt: item.processing_completed_at || undefined,
		};

		return NextResponse.json(response);
	} catch (error) {
		await Logger.error(MODULE, 'Error fetching processing status', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
