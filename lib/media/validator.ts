/**
 * Media Validation Utilities for Instagram Stories
 * 
 * Instagram Stories have specific requirements:
 * - Recommended aspect ratio: 9:16 (vertical)
 * - Ideal resolution: 1080x1920 pixels
 * - Supported ratios: between 0.1:1 and 10:1
 * - But anything outside 9:16 will be cropped or letterboxed
 */

import { MediaDimensions, AspectRatioInfo } from '@/lib/types';


// Instagram Story constants
export const STORY_IDEAL_WIDTH = 1080;
export const STORY_IDEAL_HEIGHT = 1920;
export const STORY_IDEAL_RATIO = 9 / 16; // 0.5625

// Tolerance for "close enough" to ideal ratio
const RATIO_TOLERANCE = 0.05; // 5% tolerance

/**
 * Calculates aspect ratio information for given dimensions
 */
export function analyzeAspectRatio(dimensions: MediaDimensions): AspectRatioInfo {
    const { width, height } = dimensions;
    const ratio = width / height;

    const ratioDifference = Math.abs(ratio - STORY_IDEAL_RATIO);
    const isIdeal = ratioDifference < 0.01; // Very close to 9:16
    const isAcceptable = ratioDifference < RATIO_TOLERANCE;

    let recommendation: AspectRatioInfo['recommendation'];
    let message: string;

    if (isIdeal) {
        recommendation = 'perfect';
        message = 'Perfect 9:16 aspect ratio for Stories!';
    } else if (isAcceptable) {
        recommendation = 'acceptable';
        message = 'Aspect ratio is close enough to 9:16. Minor cropping may occur.';
    } else if (ratio > STORY_IDEAL_RATIO) {
        // Wider than ideal (e.g., 1:1 square, 16:9 landscape)
        recommendation = 'needs_padding';
        message = `Image is too wide (${getRatioName(ratio)}). Will add vertical padding to fit Stories.`;
    } else {
        // Taller than ideal (very rare)
        recommendation = 'needs_crop';
        message = `Image is too tall. May need cropping to fit Stories.`;
    }

    return {
        ratio,
        isIdeal,
        isAcceptable,
        needsProcessing: !isIdeal && !isAcceptable,
        recommendation,
        message
    };
}

/**
 * Returns a human-readable name for common aspect ratios
 */
function getRatioName(ratio: number): string {
    if (Math.abs(ratio - 1) < 0.05) return '1:1 Square';
    if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9 Landscape';
    if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
    if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2';
    if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16 Portrait';
    return `${ratio.toFixed(2)}:1`;
}

/**
 * Validates image dimensions for Instagram Stories
 */
export function validateForStories(dimensions: MediaDimensions): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    aspectInfo: AspectRatioInfo;
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const aspectInfo = analyzeAspectRatio(dimensions);

    // Check minimum dimensions (Instagram requirement)
    if (dimensions.width < 320 || dimensions.height < 320) {
        errors.push('Image is too small. Minimum dimension is 320px.');
    }

    // Check maximum dimensions
    if (dimensions.width > 1440) {
        warnings.push('Image is wider than 1440px. Instagram will resize it.');
    }

    // Check aspect ratio
    if (aspectInfo.needsProcessing) {
        warnings.push(aspectInfo.message);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        aspectInfo
    };
}

/**
 * Gets dimensions from an image URL (client-side)
 */
export function getImageDimensionsFromUrl(url: string): Promise<MediaDimensions> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

/**
 * Gets dimensions from a File object (client-side)
 */
export function getImageDimensionsFromFile(file: File): Promise<MediaDimensions> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image from file'));
        };
        img.src = url;
    });
}
