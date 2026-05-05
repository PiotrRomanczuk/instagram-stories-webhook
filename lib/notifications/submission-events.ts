/**
 * Creator-facing notification triggers for submission lifecycle events.
 *
 * Each helper here is the single source of truth for what message a creator
 * sees when their submission moves through the pipeline. Wire these into the
 * call sites that mutate `submission_status` / `publishing_status`.
 */

import { createNotification, type NotificationType } from '@/lib/notifications';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'notifications:submission-events';

export type SubmissionEvent =
    | { kind: 'approved'; userId: string; contentId: string; title?: string }
    | {
            kind: 'rejected';
            userId: string;
            contentId: string;
            title?: string;
            reason?: string;
        }
    | {
            kind: 'scheduled';
            userId: string;
            contentId: string;
            title?: string;
            scheduledTime?: number;
        }
    | {
            kind: 'published';
            userId: string;
            contentId: string;
            title?: string;
            igMediaId?: string;
        };

interface NotificationPayload {
    type: NotificationType;
    title: string;
    message: string;
}

export function buildSubmissionNotification(
    event: SubmissionEvent,
): NotificationPayload {
    const label = event.title ? `"${event.title}"` : 'Your submission';

    switch (event.kind) {
        case 'approved':
            return {
                type: 'meme_approved',
                title: 'Submission approved',
                message: `${label} was approved and will be scheduled for publishing.`,
            };
        case 'rejected':
            return {
                type: 'meme_rejected',
                title: 'Submission needs a revision',
                message: event.reason
                    ? `${label} was not accepted. Reason: ${event.reason}`
                    : `${label} was not accepted. Please review the guidelines and try again.`,
            };
        case 'scheduled': {
            const when = event.scheduledTime
                ? new Date(event.scheduledTime).toUTCString()
                : null;
            return {
                type: 'meme_scheduled',
                title: 'Scheduled for publishing',
                message: when
                    ? `${label} is scheduled for ${when}.`
                    : `${label} is queued for publishing.`,
            };
        }
        case 'published':
            return {
                type: 'meme_published',
                title: 'Your post is live',
                message: event.igMediaId
                    ? `${label} was just published on Instagram (${event.igMediaId}).`
                    : `${label} was just published on Instagram.`,
            };
    }
}

/**
 * Persist a submission notification. Errors are logged but never thrown —
 * notification delivery should never block the underlying status transition.
 */
export async function notifySubmissionEvent(event: SubmissionEvent): Promise<void> {
    if (!event.userId) {
        Logger.warn(MODULE, `notifySubmissionEvent called without userId for ${event.kind}`);
        return;
    }
    const payload = buildSubmissionNotification(event);
    try {
        await createNotification({
            userId: event.userId,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            relatedType: 'content_item',
            relatedId: event.contentId,
        });
    } catch (error) {
        Logger.error(
            MODULE,
            `Failed to create notification for ${event.kind} on ${event.contentId}`,
            error,
        );
    }
}
