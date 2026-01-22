import { describe, it, expect } from 'vitest';
import {
    submitMemeSchema,
    updateMemeSubmissionSchema,
    reviewMemeSchema,
} from '@/lib/validations/meme.schema';

describe('submitMemeSchema', () => {
    it('should accept valid meme submission via URL', () => {
        const validData = {
            mediaUrl: 'https://example.com/meme.jpg',
            caption: 'Test meme caption',
            title: 'Valid Title',
        };

        const result = submitMemeSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    // Since caption is optional now, we don't test for required caption rejection here unless we change the schema.
    // The schema says .optional().

    it('should reject invalid URL', () => {
        const invalidData = {
            mediaUrl: 'not-a-url',
        };
        const result = submitMemeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should reject caption exceeding 2200 characters', () => {
        const invalidData = {
            mediaUrl: 'https://example.com/meme.jpg',
            caption: 'a'.repeat(2201),
        };

        const result = submitMemeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should accept missing optional fields', () => {
        const validData = {
            mediaUrl: 'https://example.com/meme.jpg',
            // No caption, no title
        };
        const result = submitMemeSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });
});

describe('updateMemeSubmissionSchema', () => {
    it('should accept valid caption update', () => {
        const result = updateMemeSubmissionSchema.safeParse({
            caption: 'Updated caption',
        });
        expect(result.success).toBe(true);
    });

    it('should reject empty caption', () => {
        // This schema has .min(1)
        const result = updateMemeSubmissionSchema.safeParse({
            caption: '',
        });
        expect(result.success).toBe(false);
    });
});

describe('reviewMemeSchema', () => {
    it('should accept approve action', () => {
        const result = reviewMemeSchema.safeParse({
            action: 'approve',
        });
        expect(result.success).toBe(true);
    });

    it('should accept schedule action with future date', () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const result = reviewMemeSchema.safeParse({
            action: 'schedule',
            scheduledFor: futureDate,
        });
        expect(result.success).toBe(true);
    });

    it('should reject schedule action without scheduledFor', () => {
        const result = reviewMemeSchema.safeParse({
            action: 'schedule',
        });
        expect(result.success).toBe(false);
    });
});
