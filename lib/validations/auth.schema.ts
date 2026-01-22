import { z } from 'zod';

/**
 * Schema for user authentication/whitelist
 */
export const userAuthSchema = z.object({
    email: z
        .preprocess((val) => typeof val === 'string' ? val.trim().toLowerCase() : val, z.string().email('Must be a valid email address')),

    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name too long'),
});

/**
 * Schema for adding user to whitelist
 */
export const addToWhitelistSchema = z.object({
    email: z.preprocess((val) => typeof val === 'string' ? val.trim().toLowerCase() : val, z.string().email('Must be a valid email address')),

    role: z.enum(['user', 'admin']).default('user'),
});

/**
 * Schema for Instagram account connection
 */
export const connectInstagramSchema = z.object({
    accessToken: z
        .string()
        .min(1, 'Access token is required'),

    userId: z
        .string()
        .min(1, 'User ID is required'),

    pageId: z
        .string()
        .min(1, 'Page ID is required'),

    instagramBusinessAccountId: z
        .string()
        .min(1, 'Instagram Business Account ID is required'),
});

/**
 * Schema for configuration settings
 */
export const configurationSchema = z.object({
    // Meta/Facebook settings
    metaAppId: z
        .string()
        .min(1, 'Meta App ID is required'),

    metaAppSecret: z
        .string()
        .min(1, 'Meta App Secret is required'),

    // Google OAuth settings
    googleClientId: z
        .string()
        .min(1, 'Google Client ID is required'),

    googleClientSecret: z
        .string()
        .min(1, 'Google Client Secret is required'),

    // Supabase settings
    supabaseUrl: z
        .string()
        .url('Must be a valid URL'),

    supabaseAnonKey: z
        .string()
        .min(1, 'Supabase Anon Key is required'),

    supabaseServiceRoleKey: z
        .string()
        .min(1, 'Supabase Service Role Key is required'),

    // Optional settings
    webhookVerifyToken: z
        .string()
        .optional(),

    cloudflareUrl: z
        .string()
        .url('Must be a valid URL')
        .optional(),
});

/**
 * Inferred TypeScript types
 */
export type UserAuthInput = z.infer<typeof userAuthSchema>;
export type AddToWhitelistInput = z.infer<typeof addToWhitelistSchema>;
export type ConnectInstagramInput = z.infer<typeof connectInstagramSchema>;
export type ConfigurationInput = z.infer<typeof configurationSchema>;
