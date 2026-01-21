import { describe, it, expect } from 'vitest';
import { validateForStories, analyzeAspectRatio } from '@/lib/media/validator';

describe('Media Validator', () => {
    describe('analyzeAspectRatio', () => {
        it('should identify perfect 9:16 ratio', () => {
            const result = analyzeAspectRatio({ width: 1080, height: 1920 });
            expect(result.isIdeal).toBe(true);
            expect(result.recommendation).toBe('perfect');
            expect(result.needsProcessing).toBe(false);
        });

        it('should accept ratios within 5% tolerance', () => {
            // slightly wider than 9:16 (1080 * 1.04 = 1123)
            const result = analyzeAspectRatio({ width: 1123, height: 1920 });
            expect(result.isIdeal).toBe(false);
            expect(result.isAcceptable).toBe(true);
            expect(result.recommendation).toBe('acceptable');
            expect(result.needsProcessing).toBe(false);
        });

        it('should flag wide images as needing padding', () => {
            // 16:9 Landscape
            const result = analyzeAspectRatio({ width: 1920, height: 1080 });
            expect(result.needsProcessing).toBe(true);
            expect(result.recommendation).toBe('needs_padding');
            expect(result.message).toContain('too wide');
        });

        it('should flag square images as needing padding', () => {
            // 1:1 Square
            const result = analyzeAspectRatio({ width: 1080, height: 1080 });
            expect(result.needsProcessing).toBe(true);
            expect(result.recommendation).toBe('needs_padding');
        });

        it('should flag tall images as needing crop', () => {
            // Very tall (e.g. 9:20)
            const result = analyzeAspectRatio({ width: 900, height: 2000 });
            expect(result.needsProcessing).toBe(true);
            expect(result.recommendation).toBe('needs_crop'); // < 0.5625
            expect(result.message).toContain('too tall');
        });
    });

    describe('validateForStories', () => {
        it('should return valid for perfect dimensions', () => {
            const result = validateForStories({ width: 1080, height: 1920 });
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('should error on images too small (<320px)', () => {
            const result = validateForStories({ width: 300, height: 500 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Image is too small. Minimum dimension is 320px.');
        });

        it('should warn on images too wide (>1440px)', () => {
            const result = validateForStories({ width: 1500, height: 2666 }); // Correct ratio, but too big
            expect(result.valid).toBe(true); // Still valid, but warns
            expect(result.warnings).toContain('Image is wider than 1440px. Instagram will resize it.');
        });

        it('should warn when processing is needed', () => {
            const result = validateForStories({ width: 1080, height: 1080 }); // Square
            expect(result.valid).toBe(true);
            expect(result.aspectInfo.needsProcessing).toBe(true);
            expect(result.warnings).toHaveLength(1);
        });
    });
});
