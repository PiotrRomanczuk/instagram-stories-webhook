import { describe, it, expect } from 'vitest';
import {
    createScheduledPostSchema,
    updateScheduledPostSchema,
    publishPostSchema,
} from '@/lib/validations/post.schema';

describe('createScheduledPostSchema', () => {
    it('should accept valid scheduled post', () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const validData = {
            caption: 'Test post caption',
            mediaUrl: 'https://example.com/image.jpg',
            scheduledFor: futureDate,
        };
        const result = createScheduledPostSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should accept empty caption (optional)', () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const data = {
            caption: '', // Should valid because optional/default
            mediaUrl: 'https://example.com/image.jpg',
            scheduledFor: futureDate,
        };
        const result = createScheduledPostSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('should reject caption exceeding 2200 characters', () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const invalidData = {
            caption: 'a'.repeat(2201),
            mediaUrl: 'https://example.com/image.jpg',
            scheduledFor: futureDate,
        };
        const result = createScheduledPostSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    // ... (Keep other valid tests) ... 

    it('should reject invalid URL', () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const invalidData = {
            mediaUrl: 'not-a-url',
            scheduledFor: futureDate,
        };
        const result = createScheduledPostSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject past date', () => {
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const invalidData = {
            mediaUrl: 'https://example.com/image.jpg',
            scheduledFor: pastDate,
        };
        const result = createScheduledPostSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('updateScheduledPostSchema', () => {
    // Same as before
    it('should accept partial updates', () => {
        const result = updateScheduledPostSchema.safeParse({
            caption: 'Updated caption',
        });
        expect(result.success).toBe(true);
    });
});

describe('publishPostSchema', () => {
    // publishPostSchema DOES have min(1) for caption
    it('should reject empty caption', () => {
        const result = publishPostSchema.safeParse({
            caption: '',
            mediaUrl: 'https://example.com/image.jpg',
        });
        expect(result.success).toBe(false);
    });
});
