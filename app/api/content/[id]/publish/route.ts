import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserRole, getUserId } from '@/lib/auth-helpers';
import { getContentItemById, updatePublishingStatus } from '@/lib/content-db';
import { publishMedia } from '@/lib/instagram/publish';
import { processAndUploadStoryImage } from '@/lib/media/story-processor';
import { rateLimiter } from '@/lib/middleware/rate-limit';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'api:content:publish';
const API_RATE_LIMIT = { limit: 50, windowMs: 60 * 1000 };

/**
 * POST /api/content/[id]/publish
 * Immediate publish to Instagram
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const rateCheck = rateLimiter(req, API_RATE_LIMIT);
	if (rateCheck.isRateLimited) return rateCheck.response!;

	try {
		const { id } = await params;
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = getUserId(session);
		const role = getUserRole(session);

		// Fetch content item
		const item = await getContentItemById(id);

		if (!item) {
			return NextResponse.json(
				{ error: 'Content item not found' },
				{ status: 404 },
			);
		}

		// Permissions check
		if (role !== 'admin' && role !== 'developer') {
			// Users can only publish their own content
			if (item.userId !== userId) {
				return NextResponse.json(
					{ error: 'You do not have permission to publish this content' },
					{ status: 403 },
				);
			}
		}

		// Check status
		if (item.publishingStatus === 'published') {
			return NextResponse.json(
				{ error: 'Content is already published' },
				{ status: 400 },
			);
		}

		if (item.source === 'submission' && item.submissionStatus !== 'approved') {
			return NextResponse.json(
				{ error: 'Only approved submissions can be published' },
				{ status: 400 },
			);
		}

		await Logger.info(MODULE, `🚀 Publishing content ${id} to Instagram...`, {
			userId,
		});

		// Mark as processing
		await updatePublishingStatus(id, 'processing', {
			processingStartedAt: new Date().toISOString(),
		});

		try {
			// Publish to Instagram
			// Note: ContentItem currently doesn't store postType (STORY/FEED/REEL), defaulting to STORY
			// Accessing mediaType.toUpperCase() as types might be inconsistent (image vs IMAGE)
			const mediaType = item.mediaType.toUpperCase() as 'IMAGE' | 'VIDEO';

			// For IMAGE stories, process the image to 9:16 with blurred background
			let publishUrl = item.mediaUrl;
			if (mediaType === 'IMAGE') {
				await Logger.info(MODULE, `Processing image for story format...`, { id });
				try {
					publishUrl = await processAndUploadStoryImage(item.mediaUrl, id);
					await Logger.info(MODULE, `Image processed successfully`, { id, publishUrl: publishUrl.slice(0, 50) });
				} catch (processError) {
					await Logger.warn(MODULE, `Image processing failed, using original: ${processError}`, { id });
					// Fall back to original URL if processing fails
				}
			}

			const result = await publishMedia(
				publishUrl,
				mediaType,
				'STORY', // Default to STORY
				item.caption,
				userId, // The user performing the action (admin or owner)
				item.userTags,
			);

			// Mark as published
			const updatedItem = await updatePublishingStatus(id, 'published', {
				igMediaId: result?.id,
			});

			await Logger.info(MODULE, `✅ Content ${id} published successfully`, {
				igMediaId: result?.id,
			});

			return NextResponse.json({
				data: updatedItem,
				message: 'Content published successfully',
			});
		} catch (publishError: unknown) {
			const errorMessage =
				publishError instanceof Error
					? publishError.message
					: 'Publishing failed';

			await Logger.error(
				MODULE,
				`❌ Publish failed for ${id}: ${errorMessage}`,
				publishError,
			);

			// Mark as failed
			await updatePublishingStatus(id, 'failed', {
				error: errorMessage,
			});

			// If it's a specific known error, we can return appropriate status
			if (errorMessage.includes('No active Facebook connection')) {
				return NextResponse.json(
					{ error: 'Link your Instagram account first' },
					{ status: 400 },
				);
			}

			return NextResponse.json({ error: errorMessage }, { status: 500 });
		}
	} catch (error) {
		console.error('Error in POST /api/content/[id]/publish:', error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Internal Server Error',
			},
			{ status: 500 },
		);
	}
}
