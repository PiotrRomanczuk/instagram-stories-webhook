/**
 * Story Image Processor
 * Converts images to 9:16 aspect ratio with blurred background for Instagram Stories
 */

import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import { Logger } from '@/lib/utils/logger';

const MODULE = 'story-processor';

// Instagram Story dimensions (9:16 aspect ratio)
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/**
 * Downloads an image from a URL and returns it as a Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download image: ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

/**
 * Processes an image to fit Instagram Story format (9:16) with blurred background
 * - Creates a 1080x1920 canvas
 * - Adds a blurred, scaled version of the image as background
 * - Centers the original image on top (preserving aspect ratio)
 */
export async function processImageForStory(imageUrl: string): Promise<Buffer> {
	await Logger.info(MODULE, `Processing image for story format: ${imageUrl.slice(0, 50)}...`);

	// Download the original image
	const imageBuffer = await downloadImage(imageUrl);
	const image = sharp(imageBuffer);
	const metadata = await image.metadata();

	if (!metadata.width || !metadata.height) {
		throw new Error('Could not read image dimensions');
	}

	const { width: origWidth, height: origHeight } = metadata;

	// Check if image is already 9:16 (with some tolerance)
	const aspectRatio = origWidth / origHeight;
	const targetRatio = STORY_WIDTH / STORY_HEIGHT;
	const tolerance = 0.05;

	if (Math.abs(aspectRatio - targetRatio) < tolerance) {
		await Logger.info(MODULE, 'Image already has 9:16 aspect ratio, resizing only');
		// Just resize to exact dimensions
		return await sharp(imageBuffer)
			.resize(STORY_WIDTH, STORY_HEIGHT, { fit: 'cover' })
			.jpeg({ quality: 95 })
			.toBuffer();
	}

	// Calculate dimensions for the centered image (fit within frame)
	let fitWidth: number;
	let fitHeight: number;

	if (aspectRatio > targetRatio) {
		// Image is wider than 9:16, fit to width
		fitWidth = STORY_WIDTH;
		fitHeight = Math.round(STORY_WIDTH / aspectRatio);
	} else {
		// Image is taller than 9:16, fit to height
		fitHeight = STORY_HEIGHT;
		fitWidth = Math.round(STORY_HEIGHT * aspectRatio);
	}

	// Create the blurred background (scaled to cover, then blurred)
	const blurredBackground = await sharp(imageBuffer)
		.resize(STORY_WIDTH, STORY_HEIGHT, { fit: 'cover' })
		.blur(50)
		.modulate({ brightness: 0.5 }) // Darken the background
		.toBuffer();

	// Resize the main image to fit
	const mainImage = await sharp(imageBuffer)
		.resize(fitWidth, fitHeight, { fit: 'inside' })
		.toBuffer();

	// Calculate position to center the main image
	const left = Math.round((STORY_WIDTH - fitWidth) / 2);
	const top = Math.round((STORY_HEIGHT - fitHeight) / 2);

	// Composite: blurred background + centered main image
	const result = await sharp(blurredBackground)
		.composite([
			{
				input: mainImage,
				left,
				top,
			},
		])
		.jpeg({ quality: 95 })
		.toBuffer();

	await Logger.info(MODULE, `Image processed: ${origWidth}x${origHeight} -> ${STORY_WIDTH}x${STORY_HEIGHT}`);

	return result;
}

/**
 * Processes an image and uploads it to Supabase storage
 * Returns the public URL of the processed image
 */
export async function processAndUploadStoryImage(
	imageUrl: string,
	contentId: string
): Promise<string> {
	await Logger.info(MODULE, `Processing and uploading story image for content: ${contentId}`);

	// Process the image
	const processedBuffer = await processImageForStory(imageUrl);

	// Generate a unique filename
	const filename = `story-${contentId}-${Date.now()}.jpg`;
	const storagePath = `processed-stories/${filename}`;

	// Upload to Supabase storage (using 'stories' bucket)
	const { error: uploadError } = await supabaseAdmin.storage
		.from('stories')
		.upload(storagePath, processedBuffer, {
			contentType: 'image/jpeg',
			upsert: true,
		});

	if (uploadError) {
		await Logger.error(MODULE, `Failed to upload processed image: ${uploadError.message}`);
		throw new Error(`Failed to upload processed image: ${uploadError.message}`);
	}

	// Get the public URL
	const { data: urlData } = supabaseAdmin.storage
		.from('stories')
		.getPublicUrl(storagePath);

	await Logger.info(MODULE, `Processed image uploaded: ${urlData.publicUrl}`);

	return urlData.publicUrl;
}
