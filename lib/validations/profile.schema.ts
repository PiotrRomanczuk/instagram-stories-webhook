import { z } from 'zod';

export const completeOnboardingSchema = z.object({
    displayName: z
        .string()
        .trim()
        .min(1, 'Display name is required')
        .max(100, 'Display name must not exceed 100 characters'),

    handle: z
        .string()
        .trim()
        .min(1, 'Handle is required')
        .max(50, 'Handle must not exceed 50 characters')
        .regex(/^[a-zA-Z0-9_.]+$/, 'Handle may only contain letters, numbers, underscores, and dots'),

    contactEmail: z
        .string()
        .trim()
        .email('Invalid email')
        .max(255)
        .optional()
        .nullable()
        .transform((v) => v || undefined),

    acknowledgedGuidelines: z.literal(true, {
        message: 'You must acknowledge the guidelines',
    }),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
