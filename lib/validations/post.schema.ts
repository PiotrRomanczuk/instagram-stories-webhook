import { z } from 'zod';

/**
 * Schema for creating a scheduled Instagram post
 */
export const createScheduledPostSchema = z.object({
    caption: z
        .string()
        .max(2200, 'Caption cannot exceed 2200 characters')
        .optional()
        .default(''),

    mediaUrl: z
        .string()
        .url('Must be a valid URL')
        .refine(
            (url) => {
                const validExtensions = ['.jpg', '.jpeg', '.png', '.mp4', '.mov'];
                return validExtensions.some(ext => url.toLowerCase().includes(ext));
            },
            { message: 'Media must be an image or video file' }
        ),

    scheduledFor: z.coerce.date().refine(
        (date) => date > new Date(),
        { message: 'Scheduled time must be in the future' }
    ),

    userTags: z
        .array(z.string())
        .max(20, 'Maximum 20 user tags allowed')
        .optional(),

    hashtagTags: z
        .array(z.string())
        .max(30, 'Maximum 30 hashtags allowed')
        .optional(),

    locationId: z
        .string()
        .optional(),
});

/**
 * Schema for updating a scheduled post
 */
export const updateScheduledPostSchema = createScheduledPostSchema.partial();

/**
 * Schema for publishing a post immediately
 */
export const publishPostSchema = z.object({
    caption: z
        .string()
        .min(1, 'Caption is required')
        .max(2200, 'Caption cannot exceed 2200 characters'),

    mediaUrl: z
        .string()
        .url('Must be a valid URL'),

    userTags: z
        .array(z.string())
        .max(20, 'Maximum 20 user tags allowed')
        .optional(),
});

/**
 * Inferred TypeScript types
 */
export type CreateScheduledPostInput = z.infer<typeof createScheduledPostSchema>;
export type UpdateScheduledPostInput = z.infer<typeof updateScheduledPostSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
