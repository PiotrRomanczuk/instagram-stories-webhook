/**
 * Generate test images for E2E tests using sharp
 *
 * Usage: npx tsx __tests__/e2e/fixtures/generate-test-images.ts
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const TEST_IMAGES_DIR = path.join(__dirname, 'test-images');

async function generateTestImages() {
	console.log('Generating test images for E2E tests...\n');

	// Ensure directory exists
	if (!fs.existsSync(TEST_IMAGES_DIR)) {
		fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
	}

	// 1. Valid square image (1080x1080) - blue
	await sharp({
		create: {
			width: 1080,
			height: 1080,
			channels: 3,
			background: { r: 59, g: 130, b: 246 }, // Blue
		},
	})
		.jpeg({ quality: 80 })
		.toFile(path.join(TEST_IMAGES_DIR, 'valid-square.jpg'));
	console.log('Created: valid-square.jpg (1080x1080)');

	// 2. Valid story image (1080x1920, 9:16 aspect) - green
	await sharp({
		create: {
			width: 1080,
			height: 1920,
			channels: 3,
			background: { r: 34, g: 197, b: 94 }, // Green
		},
	})
		.jpeg({ quality: 80 })
		.toFile(path.join(TEST_IMAGES_DIR, 'valid-story.jpg'));
	console.log('Created: valid-story.jpg (1080x1920)');

	// 3. Invalid aspect ratio (1920x1080, 16:9 landscape) - red
	await sharp({
		create: {
			width: 1920,
			height: 1080,
			channels: 3,
			background: { r: 239, g: 68, b: 68 }, // Red
		},
	})
		.jpeg({ quality: 80 })
		.toFile(path.join(TEST_IMAGES_DIR, 'invalid-aspect.jpg'));
	console.log('Created: invalid-aspect.jpg (1920x1080)');

	// 4. Small image (320x320) - yellow
	await sharp({
		create: {
			width: 320,
			height: 320,
			channels: 3,
			background: { r: 250, g: 204, b: 21 }, // Yellow
		},
	})
		.jpeg({ quality: 80 })
		.toFile(path.join(TEST_IMAGES_DIR, 'small-image.jpg'));
	console.log('Created: small-image.jpg (320x320)');

	// 5. Large but valid story (1440x2560) - purple
	await sharp({
		create: {
			width: 1440,
			height: 2560,
			channels: 3,
			background: { r: 168, g: 85, b: 247 }, // Purple
		},
	})
		.jpeg({ quality: 80 })
		.toFile(path.join(TEST_IMAGES_DIR, 'large-story.jpg'));
	console.log('Created: large-story.jpg (1440x2560)');

	// 6. PNG format image
	await sharp({
		create: {
			width: 1080,
			height: 1920,
			channels: 4,
			background: { r: 236, g: 72, b: 153, alpha: 1 }, // Pink
		},
	})
		.png()
		.toFile(path.join(TEST_IMAGES_DIR, 'valid-story.png'));
	console.log('Created: valid-story.png (1080x1920)');

	console.log('\nAll test images generated successfully!');
	console.log(`Location: ${TEST_IMAGES_DIR}`);
}

generateTestImages().catch(console.error);
