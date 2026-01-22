import { z } from 'zod';

/**
 * Schema for meme submission
 */
export const submitMemeSchema = z.object({
    caption: z
        .string()
        .max(2200, 'Caption cannot exceed 2200 characters')
        .optional(),

    title: z
        .string()
        .max(100, 'Title cannot exceed 100 characters')
        .optional(),

    mediaUrl: z
        .string()
        .url('Must be a valid URL'),

    storagePath: z.string().optional(),
});

/**
 * Schema for updating meme submission (while pending)
 */
export const updateMemeSubmissionSchema = z.object({
    caption: z
        .string()
        .min(1, 'Caption is required')
        .max(2200, 'Caption cannot exceed 2200 characters'),
});

/**
 * Schema for admin approving/rejecting meme
 */
export const reviewMemeSchema = z.object({
    action: z.enum(['approve', 'reject', 'schedule']),

    scheduledFor: z
        .coerce
        .date()
        .optional()
        .refine(
            (date) => !date || date > new Date(),
            { message: 'Scheduled time must be in the future' }
        ),

    rejectionReason: z
        .string()
        .min(1, 'Rejection reason is required when rejecting')
        .optional(),
}).refine(
    (data) => {
        // If action is 'schedule', scheduledFor must be provided
        if (data.action === 'schedule') {
            return !!data.scheduledFor;
        }
        return true;
    },
    { message: 'Scheduled time is required when scheduling', path: ['scheduledFor'] }
).refine(
    (data) => {
        // If action is 'reject', rejectionReason must be provided
        if (data.action === 'reject') {
            return !!data.rejectionReason;
        }
        return true;
    },
    { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] }
);

/**
 * Inferred TypeScript types
 */
export type SubmitMemeInput = z.infer<typeof submitMemeSchema>;
export type UpdateMemeSubmissionInput = z.infer<typeof updateMemeSubmissionSchema>;
export type ReviewMemeInput = z.infer<typeof reviewMemeSchema>;
