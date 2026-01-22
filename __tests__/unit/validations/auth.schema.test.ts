import { describe, it, expect } from 'vitest';
import {
    userAuthSchema,
    addToWhitelistSchema,
    connectInstagramSchema,
    configurationSchema,
} from '@/lib/validations/auth.schema';

describe('userAuthSchema', () => {
    it('should accept valid user auth data', () => {
        const result = userAuthSchema.safeParse({
            email: 'user@example.com',
            name: 'John Doe',
        });

        expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', () => {
        const result = userAuthSchema.safeParse({
            email: 'USER@EXAMPLE.COM',
            name: 'John Doe',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('user@example.com');
        }
    });

    it('should trim email whitespace', () => {
        const result = userAuthSchema.safeParse({
            email: '  user@example.com  ',
            name: 'John Doe',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('user@example.com');
        }
    });

    it('should reject invalid email', () => {
        const result = userAuthSchema.safeParse({
            email: 'not-an-email',
            name: 'John Doe',
        });

        expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
        const result = userAuthSchema.safeParse({
            email: 'user@example.com',
            name: '',
        });

        expect(result.success).toBe(false);
    });

    it('should reject name exceeding 100 characters', () => {
        const result = userAuthSchema.safeParse({
            email: 'user@example.com',
            name: 'a'.repeat(101),
        });

        expect(result.success).toBe(false);
    });
});

describe('addToWhitelistSchema', () => {
    it('should accept valid whitelist data with default role', () => {
        const result = addToWhitelistSchema.safeParse({
            email: 'user@example.com',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe('user');
        }
    });

    it('should accept admin role', () => {
        const result = addToWhitelistSchema.safeParse({
            email: 'admin@example.com',
            role: 'admin',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.role).toBe('admin');
        }
    });

    it('should accept user role', () => {
        const result = addToWhitelistSchema.safeParse({
            email: 'user@example.com',
            role: 'user',
        });

        expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
        const result = addToWhitelistSchema.safeParse({
            email: 'user@example.com',
            role: 'superadmin',
        });

        expect(result.success).toBe(false);
    });

    it('should normalize email', () => {
        const result = addToWhitelistSchema.safeParse({
            email: '  USER@EXAMPLE.COM  ',
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('user@example.com');
        }
    });
});

describe('connectInstagramSchema', () => {
    it('should accept valid Instagram connection data', () => {
        const result = connectInstagramSchema.safeParse({
            accessToken: 'token_123',
            userId: 'user_456',
            pageId: 'page_789',
            instagramBusinessAccountId: 'ig_account_012',
        });

        expect(result.success).toBe(true);
    });

    it('should reject missing access token', () => {
        const result = connectInstagramSchema.safeParse({
            userId: 'user_456',
            pageId: 'page_789',
            instagramBusinessAccountId: 'ig_account_012',
        });

        expect(result.success).toBe(false);
    });

    it('should reject empty access token', () => {
        const result = connectInstagramSchema.safeParse({
            accessToken: '',
            userId: 'user_456',
            pageId: 'page_789',
            instagramBusinessAccountId: 'ig_account_012',
        });

        expect(result.success).toBe(false);
    });

    it('should reject missing user ID', () => {
        const result = connectInstagramSchema.safeParse({
            accessToken: 'token_123',
            pageId: 'page_789',
            instagramBusinessAccountId: 'ig_account_012',
        });

        expect(result.success).toBe(false);
    });

    it('should reject missing page ID', () => {
        const result = connectInstagramSchema.safeParse({
            accessToken: 'token_123',
            userId: 'user_456',
            instagramBusinessAccountId: 'ig_account_012',
        });

        expect(result.success).toBe(false);
    });

    it('should reject missing Instagram account ID', () => {
        const result = connectInstagramSchema.safeParse({
            accessToken: 'token_123',
            userId: 'user_456',
            pageId: 'page_789',
        });

        expect(result.success).toBe(false);
    });
});

describe('configurationSchema', () => {
    it('should accept valid configuration', () => {
        const result = configurationSchema.safeParse({
            metaAppId: 'meta_123',
            metaAppSecret: 'secret_456',
            googleClientId: 'google_789',
            googleClientSecret: 'secret_012',
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon_key_345',
            supabaseServiceRoleKey: 'service_key_678',
        });

        expect(result.success).toBe(true);
    });

    it('should reject invalid Supabase URL', () => {
        const result = configurationSchema.safeParse({
            metaAppId: 'meta_123',
            metaAppSecret: 'secret_456',
            googleClientId: 'google_789',
            googleClientSecret: 'secret_012',
            supabaseUrl: 'not-a-url',
            supabaseAnonKey: 'anon_key_345',
            supabaseServiceRoleKey: 'service_key_678',
        });

        expect(result.success).toBe(false);
    });

    it('should accept optional webhook verify token', () => {
        const result = configurationSchema.safeParse({
            metaAppId: 'meta_123',
            metaAppSecret: 'secret_456',
            googleClientId: 'google_789',
            googleClientSecret: 'secret_012',
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon_key_345',
            supabaseServiceRoleKey: 'service_key_678',
            webhookVerifyToken: 'verify_token_901',
        });

        expect(result.success).toBe(true);
    });

    it('should accept optional Cloudflare URL', () => {
        const result = configurationSchema.safeParse({
            metaAppId: 'meta_123',
            metaAppSecret: 'secret_456',
            googleClientId: 'google_789',
            googleClientSecret: 'secret_012',
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon_key_345',
            supabaseServiceRoleKey: 'service_key_678',
            cloudflareUrl: 'https://tunnel.example.com',
        });

        expect(result.success).toBe(true);
    });

    it('should reject invalid Cloudflare URL', () => {
        const result = configurationSchema.safeParse({
            metaAppId: 'meta_123',
            metaAppSecret: 'secret_456',
            googleClientId: 'google_789',
            googleClientSecret: 'secret_012',
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon_key_345',
            supabaseServiceRoleKey: 'service_key_678',
            cloudflareUrl: 'not-a-url',
        });

        expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
        const result = configurationSchema.safeParse({
            metaAppId: 'meta_123',
        });

        expect(result.success).toBe(false);
    });
});
