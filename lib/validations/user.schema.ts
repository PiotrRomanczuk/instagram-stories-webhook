import { z } from 'zod';

/**
 * Validation schemas for user management operations
 * Used by /api/users endpoints
 */

// User role enum
export const userRoleSchema = z.enum(['developer', 'admin', 'user']);

/**
 * Schema for adding a new user to the whitelist
 * POST /api/users
 */
export const addUserSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Invalid email format')
        .toLowerCase()
        .trim()
        .max(255, 'Email must not exceed 255 characters'),

    role: userRoleSchema.default('user'),

    display_name: z
        .string()
        .trim()
        .max(100, 'Display name must not exceed 100 characters')
        .optional()
        .nullable()
        .transform(val => val || undefined),
});

export type AddUserInput = z.infer<typeof addUserSchema>;

/**
 * Schema for updating a user's role
 * PATCH /api/users/[email]
 */
export const updateUserRoleSchema = z.object({
    role: userRoleSchema
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

/**
 * Validation helper: Validate and parse request body
 */
export async function validateUserInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
        const parsed = await schema.parseAsync(data);
        return { success: true, data: parsed };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                error: firstError.message
            };
        }
        return {
            success: false,
            error: 'Invalid input data'
        };
    }
}
