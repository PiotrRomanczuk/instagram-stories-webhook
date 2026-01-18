/**
 * Server-side Image Processing for Instagram Stories
 * 
 * Uses Sharp to resize and pad images to fit the 9:16 aspect ratio
 * required for optimal Instagram Story display.
 */

import sharp from 'sharp';
import { STORY_IDEAL_WIDTH, STORY_IDEAL_HEIGHT, STORY_IDEAL_RATIO } from './validator';

export interface ProcessingOptions {
    /** Background color for padding (hex or named color) */
    backgroundColor?: string;
    /** Whether to blur the background instead of solid color */
    blurBackground?: boolean;
    /** Quality for JPEG output (1-100) */
    quality?: number;
}

export interface ProcessingResult {
    buffer: Buffer;
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    wasProcessed: boolean;
    processingType: 'none' | 'resize' | 'pad' | 'pad_blur';
}

const DEFAULT_OPTIONS: ProcessingOptions = {
    backgroundColor: '#000000',
    blurBackground: false,
    quality: 90
};

/**
 * Processes an image buffer to fit Instagram Story dimensions (9:16)
 * 
 * Strategy:
 * 1. If already 9:16 and correct size → return as-is
 * 2. If wrong aspect ratio → pad to 9:16 with background
 * 3. Resize to 1080x1920 if needed
 */
export async function processImageForStory(
    inputBuffer: Buffer,
    options: ProcessingOptions = {}
): Promise<ProcessingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Get original dimensions
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    if (!originalWidth || !originalHeight) {
        throw new Error('Could not read image dimensions');
    }

    const originalRatio = originalWidth / originalHeight;
    const ratioDifference = Math.abs(originalRatio - STORY_IDEAL_RATIO);

    // If already close to ideal ratio and reasonable size
    if (ratioDifference < 0.01 && originalWidth <= STORY_IDEAL_WIDTH * 1.2) {
        // Just resize to exact dimensions if needed
        const output = await sharp(inputBuffer)
            .resize(STORY_IDEAL_WIDTH, STORY_IDEAL_HEIGHT, { fit: 'fill' })
            .jpeg({ quality: opts.quality })
            .toBuffer();

        return {
            buffer: output,
            width: STORY_IDEAL_WIDTH,
            height: STORY_IDEAL_HEIGHT,
            originalWidth,
            originalHeight,
            wasProcessed: true,
            processingType: 'resize'
        };
    }

    // Need to pad the image to fit 9:16
    if (opts.blurBackground) {
        return await processWithBlurredBackground(inputBuffer, originalWidth, originalHeight, opts);
    } else {
        return await processWithSolidBackground(inputBuffer, originalWidth, originalHeight, opts);
    }
}

/**
 * Pads image with a solid color background
 */
async function processWithSolidBackground(
    inputBuffer: Buffer,
    originalWidth: number,
    originalHeight: number,
    opts: ProcessingOptions
): Promise<ProcessingResult> {
    // Calculate how to fit the image in 9:16 frame
    const targetRatio = STORY_IDEAL_RATIO;
    const originalRatio = originalWidth / originalHeight;

    let resizeWidth: number;
    let resizeHeight: number;

    if (originalRatio > targetRatio) {
        // Image is wider than target - fit to width
        resizeWidth = STORY_IDEAL_WIDTH;
        resizeHeight = Math.round(STORY_IDEAL_WIDTH / originalRatio);
    } else {
        // Image is taller than target - fit to height
        resizeHeight = STORY_IDEAL_HEIGHT;
        resizeWidth = Math.round(STORY_IDEAL_HEIGHT * originalRatio);
    }

    // Parse background color
    const bgColor = parseColor(opts.backgroundColor || '#000000');

    // Resize the original image
    const resizedImage = await sharp(inputBuffer)
        .resize(resizeWidth, resizeHeight, { fit: 'inside' })
        .toBuffer();

    // Create the final image with padding
    const output = await sharp({
        create: {
            width: STORY_IDEAL_WIDTH,
            height: STORY_IDEAL_HEIGHT,
            channels: 3,
            background: bgColor
        }
    })
        .composite([{
            input: resizedImage,
            gravity: 'center'
        }])
        .jpeg({ quality: opts.quality })
        .toBuffer();

    return {
        buffer: output,
        width: STORY_IDEAL_WIDTH,
        height: STORY_IDEAL_HEIGHT,
        originalWidth,
        originalHeight,
        wasProcessed: true,
        processingType: 'pad'
    };
}

/**
 * Pads image with a blurred version of itself as background
 */
async function processWithBlurredBackground(
    inputBuffer: Buffer,
    originalWidth: number,
    originalHeight: number,
    opts: ProcessingOptions
): Promise<ProcessingResult> {
    const targetRatio = STORY_IDEAL_RATIO;
    const originalRatio = originalWidth / originalHeight;

    let resizeWidth: number;
    let resizeHeight: number;

    if (originalRatio > targetRatio) {
        resizeWidth = STORY_IDEAL_WIDTH;
        resizeHeight = Math.round(STORY_IDEAL_WIDTH / originalRatio);
    } else {
        resizeHeight = STORY_IDEAL_HEIGHT;
        resizeWidth = Math.round(STORY_IDEAL_HEIGHT * originalRatio);
    }

    // Create blurred background (stretched to fill)
    const blurredBackground = await sharp(inputBuffer)
        .resize(STORY_IDEAL_WIDTH, STORY_IDEAL_HEIGHT, { fit: 'cover' })
        .blur(50)
        .modulate({ brightness: 0.5 }) // Darken for better contrast
        .toBuffer();

    // Resize the original image
    const resizedImage = await sharp(inputBuffer)
        .resize(resizeWidth, resizeHeight, { fit: 'inside' })
        .toBuffer();

    // Composite the sharp image over the blurred background
    const output = await sharp(blurredBackground)
        .composite([{
            input: resizedImage,
            gravity: 'center'
        }])
        .jpeg({ quality: opts.quality })
        .toBuffer();

    return {
        buffer: output,
        width: STORY_IDEAL_WIDTH,
        height: STORY_IDEAL_HEIGHT,
        originalWidth,
        originalHeight,
        wasProcessed: true,
        processingType: 'pad_blur'
    };
}

/**
 * Parse hex color to RGB object
 */
function parseColor(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }
    return { r: 0, g: 0, b: 0 }; // Default to black
}

/**
 * Quick check if an image needs processing
 */
export async function needsProcessing(inputBuffer: Buffer): Promise<boolean> {
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (!width || !height) return true;

    const ratio = width / height;
    const ratioDifference = Math.abs(ratio - STORY_IDEAL_RATIO);

    // Needs processing if ratio is off or dimensions are wrong
    return ratioDifference > 0.02 || width > STORY_IDEAL_WIDTH * 1.2;
}
