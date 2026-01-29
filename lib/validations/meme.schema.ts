import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Schema for meme submission
 */
export const submitMemeSchema = z.object({
	caption: z
		.string()
		.max(2200, 'Caption cannot exceed 2200 characters')
		.transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
		.optional(),

	title: z
		.string()
		.max(100, 'Title cannot exceed 100 characters')
		.transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
		.optional(),

	mediaUrl: z.string().url('Must be a valid URL'),

	storagePath: z.string().optional(),
});

/**
 * Schema for updating meme submission (while pending)
 */
export const updateMemeSubmissionSchema = z
	.object({
		title: z
			.string()
			.max(100, 'Title cannot exceed 100 characters')
			.transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
			.optional(),

		caption: z
			.string()
			.max(2200, 'Caption cannot exceed 2200 characters')
			.transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
			.optional(),
	})
	.refine((data) => data.title || data.caption, {
		message: 'At least title or caption is required',
	});

/**
 * Schema for admin approving/rejecting meme
 */
export const reviewMemeSchema = z
	.object({
		action: z.enum(['approve', 'reject', 'schedule']),

		scheduledFor: z.coerce
			.date()
			.optional()
			.refine((date) => !date || date.getTime() > Date.now() - 1000 * 60 * 2, {
				// Allow up to 2 mins in past for network latency/immediate schedule
				message: 'Scheduled time cannot be in the past (more than 2 mins)',
			}),

		rejectionReason: z
			.string()
			.min(1, 'Rejection reason is required when rejecting')
			.optional(),
	})
	.refine(
		(data) => {
			// If action is 'schedule', scheduledFor must be provided
			if (data.action === 'schedule') {
				return !!data.scheduledFor;
			}
			return true;
		},
		{
			message: 'Scheduled time is required when scheduling',
			path: ['scheduledFor'],
		},
	)
	.refine(
		(data) => {
			// If action is 'reject', rejectionReason must be provided
			if (data.action === 'reject') {
				return !!data.rejectionReason;
			}
			return true;
		},
		{
			message: 'Rejection reason is required when rejecting',
			path: ['rejectionReason'],
		},
	);

/**
 * Inferred TypeScript types
 */
export type SubmitMemeInput = z.infer<typeof submitMemeSchema>;
export type UpdateMemeSubmissionInput = z.infer<
	typeof updateMemeSubmissionSchema
>;
export type ReviewMemeInput = z.infer<typeof reviewMemeSchema>;
