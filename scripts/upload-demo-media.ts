/**
 * Upload demo media to Supabase Storage
 *
 * Downloads portrait images from picsum.photos and short public-domain MP4 videos,
 * then uploads them to stories/demo/ in Supabase Storage.
 *
 * Usage: npx tsx scripts/upload-demo-media.ts
 *
 * Paths:
 *   stories/demo/images/*.jpg   — portrait placeholder images
 *   stories/demo/videos/*.mp4   — short demo videos
 *   stories/demo/thumbnails/*.jpg — video thumbnails
 */

import { createWriteStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const BUCKET = 'stories';

// Portrait images from picsum (1080x1920 story aspect ratio)
const IMAGE_SOURCES: Record<string, string> = {};
const imageCategories = ['pending', 'approved', 'scheduled', 'overdue', 'published', 'failed', 'rejected'];
let picsumId = 10;
for (const category of imageCategories) {
	const count = category === 'pending' ? 5 : category === 'scheduled' ? 6 : category === 'published' ? 7 : category === 'approved' ? 3 : category === 'overdue' ? 3 : 2;
	for (let i = 1; i <= count; i++) {
		IMAGE_SOURCES[`${category}-${i}.jpg`] = `https://picsum.photos/id/${picsumId++}/1080/1920`;
	}
}

// Short public-domain MP4 videos (from Pixabay/Pexels CDN or similar)
// Using picsum for thumbnail placeholders
const VIDEO_SOURCES: Record<string, string> = {
	'pending-1.mp4': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
	'pending-2.mp4': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
	'pending-3.mp4': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
	'approved-1.mp4': 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
};

const THUMBNAIL_SOURCES: Record<string, string> = {};
let thumbId = 100;
for (const key of Object.keys(VIDEO_SOURCES)) {
	const name = key.replace('.mp4', '.jpg');
	THUMBNAIL_SOURCES[name] = `https://picsum.photos/id/${thumbId++}/1080/1920`;
}

async function downloadFile(url: string, dest: string): Promise<void> {
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
	const body = res.body;
	if (!body) throw new Error(`No body for ${url}`);
	const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
	await pipeline(nodeStream, createWriteStream(dest));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadToStorage(
	supabase: { storage: { from: (bucket: string) => any } },
	localPath: string,
	storagePath: string,
	contentType: string,
): Promise<string> {
	const { readFile } = await import('fs/promises');
	const fileBuffer = await readFile(localPath);

	const { error } = await supabase.storage
		.from(BUCKET)
		.upload(storagePath, fileBuffer, {
			contentType,
			upsert: true,
		});

	if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`);

	const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
	return data.publicUrl;
}

async function main() {
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	const tmpDir = await mkdtemp(join(tmpdir(), 'demo-media-'));
	console.log(`Temp directory: ${tmpDir}`);

	try {
		// Upload images
		console.log(`\nUploading ${Object.keys(IMAGE_SOURCES).length} images...`);
		for (const [name, url] of Object.entries(IMAGE_SOURCES)) {
			const localPath = join(tmpDir, name);
			process.stdout.write(`  ${name}... `);
			await downloadFile(url, localPath);
			const publicUrl = await uploadToStorage(supabaseAdmin, localPath, `demo/images/${name}`, 'image/jpeg');
			console.log(`OK → ${publicUrl}`);
		}

		// Upload videos
		console.log(`\nUploading ${Object.keys(VIDEO_SOURCES).length} videos...`);
		for (const [name, url] of Object.entries(VIDEO_SOURCES)) {
			const localPath = join(tmpDir, name);
			process.stdout.write(`  ${name}... `);
			await downloadFile(url, localPath);
			const publicUrl = await uploadToStorage(supabaseAdmin, localPath, `demo/videos/${name}`, 'video/mp4');
			console.log(`OK → ${publicUrl}`);
		}

		// Upload thumbnails
		console.log(`\nUploading ${Object.keys(THUMBNAIL_SOURCES).length} thumbnails...`);
		for (const [name, url] of Object.entries(THUMBNAIL_SOURCES)) {
			const localPath = join(tmpDir, name);
			process.stdout.write(`  ${name}... `);
			await downloadFile(url, localPath);
			const publicUrl = await uploadToStorage(supabaseAdmin, localPath, `demo/thumbnails/${name}`, 'image/jpeg');
			console.log(`OK → ${publicUrl}`);
		}

		console.log('\nAll demo media uploaded successfully!');
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
