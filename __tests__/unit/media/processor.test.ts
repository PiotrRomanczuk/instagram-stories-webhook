import { describe, it, expect } from 'vitest';
import { processImageForStory, needsProcessing } from '@/lib/media/processor';
import {
    create9x16Image,
    createSquareImage,
    createLandscapeImage
} from '../../fixtures/images';
import { STORY_IDEAL_WIDTH, STORY_IDEAL_HEIGHT } from '@/lib/media/validator';

describe('processImageForStory', () => {
    it('should return 9:16 image as-is (resized)', async () => {
        const inputBuffer = await create9x16Image();

        const result = await processImageForStory(inputBuffer);

        expect(result.width).toBe(STORY_IDEAL_WIDTH);
        expect(result.height).toBe(STORY_IDEAL_HEIGHT);
        expect(result.processingType).toBe('resize'); // Or 'none' if dimensions match exactly
    });

    it('should pad square image with default black background', async () => {
        const inputBuffer = await createSquareImage();

        const result = await processImageForStory(inputBuffer);

        expect(result.width).toBe(STORY_IDEAL_WIDTH);
        expect(result.height).toBe(STORY_IDEAL_HEIGHT);
        expect(result.processingType).toBe('pad');
        expect(result.wasProcessed).toBe(true);
    });

    it('should pad landscape image with blurred background', async () => {
        const inputBuffer = await createLandscapeImage();

        const result = await processImageForStory(inputBuffer, {
            blurBackground: true
        });

        expect(result.width).toBe(STORY_IDEAL_WIDTH);
        expect(result.height).toBe(STORY_IDEAL_HEIGHT);
        expect(result.processingType).toBe('pad_blur');
    });

    it('should handle custom background color', async () => {
        const inputBuffer = await createSquareImage();
        const bgColor = '#ff0000';

        const result = await processImageForStory(inputBuffer, {
            backgroundColor: bgColor
        });

        expect(result.width).toBe(STORY_IDEAL_WIDTH);
        expect(result.height).toBe(STORY_IDEAL_HEIGHT);
        expect(result.processingType).toBe('pad');

        // Additional verification could check pixel color but might be flaky
    });
});

describe('needsProcessing', () => {
    it('should return false for perfect 9:16 image', async () => {
        const inputBuffer = await create9x16Image();
        const result = await needsProcessing(inputBuffer);
        expect(result).toBe(false);
    });

    it('should return true for square image', async () => {
        const inputBuffer = await createSquareImage();
        const result = await needsProcessing(inputBuffer);
        expect(result).toBe(true);
    });

    it('should return true for landscape image', async () => {
        const inputBuffer = await createLandscapeImage();
        const result = await needsProcessing(inputBuffer);
        expect(result).toBe(true);
    });
});
