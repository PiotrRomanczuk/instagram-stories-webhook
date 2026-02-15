/**
 * Unified content database utilities
 * Handles queries for the content_items table (consolidates meme_submissions and scheduled_posts)
 *
 * This file re-exports from focused sub-modules for backward compatibility.
 * New code should import directly from 'lib/content-db/queries', 'lib/content-db/mutations', etc.
 */

export { getContentItems, getContentItemById, getReviewQueue, getScheduledItems, getContentItemForProcessing } from './content-db/queries';
export { createContentItem, updateContentItem, updateSubmissionStatus, updatePublishingStatus, updateScheduledTime, deleteContentItem } from './content-db/mutations';
export { bulkUpdateSubmissionStatus, reorderScheduledItems } from './content-db/bulk';
export { getPendingContentItems, acquireContentProcessingLock, releaseContentProcessingLock, markContentPublished, markContentFailed, markContentCancelled } from './content-db/processing';
export { archiveContentItem, getOverdueCount, getContentStats } from './content-db/stats';
