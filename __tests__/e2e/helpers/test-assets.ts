import * as path from 'path';
import * as fs from 'fs';
import type { APIRequestContext } from '@playwright/test';

const MEMES_DIR = path.join(process.cwd(), 'memes');
const FIXTURE_IMAGES_DIR = path.join(process.cwd(), '__tests__/e2e/fixtures/test-images');
const TEST_VIDEO_PATH = path.join(process.cwd(), '__tests__/fixtures/test-video.mp4');

/**
 * Returns the directory containing test images.
 * Prefers /memes (local dev with real memes) but falls back to
 * __tests__/e2e/fixtures/test-images/ (always available in CI).
 */
function getImagesDir(): string {
  if (fs.existsSync(MEMES_DIR)) return MEMES_DIR;
  if (fs.existsSync(FIXTURE_IMAGES_DIR)) return FIXTURE_IMAGES_DIR;
  throw new Error(
    `No test images found. Either add memes to ${MEMES_DIR} or generate fixtures with: npx tsx __tests__/e2e/fixtures/generate-test-images.ts`
  );
}

export function getAllMemes(): string[] {
  const dir = getImagesDir();
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(dir, f));
}

export function getRandomMeme(): string {
  const memes = getAllMemes();
  return memes[Math.floor(Math.random() * memes.length)];
}

export function getMemeByIndex(index: number): string {
  const memes = getAllMemes();
  return memes[index % memes.length];
}

/**
 * Get a meme that hasn't been published in the last 24 hours
 *
 * @param request - Playwright API request context for querying the API
 * @returns Path to an unpublished meme, or null if all memes were recently published
 */
export async function getUnpublishedMeme(request: APIRequestContext): Promise<string | null> {
  try {
    // Get all available memes
    const allMemes = getAllMemes();
    const allMemeFilenames = allMemes.map(memePath => path.basename(memePath));

    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Query recently published content
    const response = await request.get('/api/content?limit=100&sortBy=newest');

    if (!response.ok()) {
      console.warn('⚠️ Failed to fetch publishing history, using random meme');
      return getRandomMeme();
    }

    const data = await response.json();
    const recentlyPublishedFilenames = new Set<string>();

    // Extract filenames from recently published content (last 24 hours)
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        // Check if published in last 24 hours
        const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;

        if (publishedAt > twentyFourHoursAgo && item.mediaUrl) {
          // Extract filename from URL (handle both direct filenames and URLs)
          const filename = extractFilenameFromUrl(item.mediaUrl);
          if (filename) {
            recentlyPublishedFilenames.add(filename);
          }
        }

        // Also check storagePath if available
        if (publishedAt > twentyFourHoursAgo && item.storagePath) {
          const filename = path.basename(item.storagePath);
          recentlyPublishedFilenames.add(filename);
        }
      }
    }

    console.log(`📊 Recently published (24h): ${recentlyPublishedFilenames.size} memes`);

    // Find memes that haven't been published recently
    const unpublishedMemes = allMemes.filter(memePath => {
      const filename = path.basename(memePath);
      return !recentlyPublishedFilenames.has(filename);
    });

    if (unpublishedMemes.length === 0) {
      console.warn('⚠️ All memes were published in the last 24 hours!');
      return null;
    }

    // Return the first unpublished meme
    const selectedMeme = unpublishedMemes[0];
    console.log(`✅ Selected unpublished meme: ${path.basename(selectedMeme)}`);

    return selectedMeme;
  } catch (error) {
    console.error('❌ Error checking publishing history:', error);
    // Fallback to random meme if API check fails
    return getRandomMeme();
  }
}

/**
 * Extract filename from a URL or path
 */
function extractFilenameFromUrl(url: string): string | null {
  try {
    // If it's a full URL, parse it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return path.basename(pathname);
    }

    // Otherwise treat it as a path
    return path.basename(url);
  } catch (error) {
    return null;
  }
}

/**
 * Get the test video path for live publishing tests
 * Returns null if test video doesn't exist
 */
export function getTestVideo(): string | null {
  if (fs.existsSync(TEST_VIDEO_PATH)) {
    return TEST_VIDEO_PATH;
  }
  console.warn('⚠️ Test video not found at:', TEST_VIDEO_PATH);
  return null;
}

/**
 * Check if test video has been published in the last 24 hours
 *
 * @param request - Playwright API request context for querying the API
 * @returns true if video can be published (wasn't published recently), false otherwise
 */
export async function canPublishTestVideo(request: APIRequestContext): Promise<boolean> {
  try {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Query recently published content
    const response = await request.get('/api/content?limit=100&sortBy=newest&mediaType=VIDEO');

    if (!response.ok()) {
      console.warn('⚠️ Failed to fetch video publishing history, allowing publish');
      return true;
    }

    const data = await response.json();

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        // Check if it's a video published in last 24 hours
        const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;

        if (publishedAt > twentyFourHoursAgo && item.mediaType === 'VIDEO') {
          // Check if it's the test video
          const filename = item.mediaUrl ? extractFilenameFromUrl(item.mediaUrl) : null;
          if (filename === 'test-video.mp4' || item.storagePath?.includes('test-video')) {
            console.log('⚠️ Test video was published in the last 24 hours');
            return false;
          }
        }
      }
    }

    console.log('✅ Test video can be published (not published in last 24h)');
    return true;
  } catch (error) {
    console.error('❌ Error checking video publishing history:', error);
    // Allow publish on error to avoid blocking tests
    return true;
  }
}
