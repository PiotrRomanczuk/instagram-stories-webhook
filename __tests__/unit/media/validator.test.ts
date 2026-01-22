import { describe, it, expect } from 'vitest';
import {
    analyzeAspectRatio,
    validateForStories,
} from '@/lib/media/validator';

describe('analyzeAspectRatio', () => {
    it('should identify perfect 9:16 ratio', () => {
        const result = analyzeAspectRatio({ width: 1080, height: 1920 });

        expect(result.isIdeal).toBe(true);
        expect(result.needsProcessing).toBe(false);
        expect(result.recommendation).toBe('perfect');
    });

    it('should identify acceptable close-to-9:16 ratio', () => {
        // 1120x1920 is ~0.58, which is > 0.01 difference from 0.5625 but < 0.05
        const result = analyzeAspectRatio({ width: 1120, height: 1920 });

        expect(result.isIdeal).toBe(false);
        expect(result.isAcceptable).toBe(true);
        expect(result.needsProcessing).toBe(false);
        expect(result.recommendation).toBe('acceptable');
    });

    it('should identify 1:1 square as needing padding', () => {
        const result = analyzeAspectRatio({ width: 1080, height: 1080 });

        expect(result.isIdeal).toBe(false);
        expect(result.isAcceptable).toBe(false);
        expect(result.needsProcessing).toBe(true);
        expect(result.recommendation).toBe('needs_padding');
    });

    // ... rest of the tests (same as before)
    it('should identify 16:9 landscape as needing padding', () => {
        const result = analyzeAspectRatio({ width: 1920, height: 1080 });

        expect(result.needsProcessing).toBe(true);
        expect(result.recommendation).toBe('needs_padding');
    });

    it('should identify very tall images as needing crop', () => {
        const result = analyzeAspectRatio({ width: 1000, height: 3000 });

        expect(result.needsProcessing).toBe(true);
        expect(result.recommendation).toBe('needs_crop');
    });
});

describe('validateForStories', () => {
    // Same tests...
    it('should pass valid 9:16 image', () => {
        const result = validateForStories({ width: 1080, height: 1920 });
        expect(result.valid).toBe(true);
    });

    it('should fail too small image', () => {
        const result = validateForStories({ width: 200, height: 355 });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn on too wide image', () => {
        const result = validateForStories({ width: 2000, height: 2000 });
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn when processing is needed', () => {
        const result = validateForStories({ width: 1080, height: 1080 });
        expect(result.warnings.some((w: string) => w.includes('needs_padding') || w.includes('too wide') || w.includes('Square'))).toBe(true);
    });
});
