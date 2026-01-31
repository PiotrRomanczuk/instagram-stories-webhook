/**
 * Seed script to create 90 test memes from local files
 *
 * Usage: npx tsx scripts/seed-test-memes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

async function seedTestMemes() {
	// Load env first
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	console.log('🌱 Seeding memes from local files...\n');

	// Config
	const TEST_USER_EMAIL = 'granagitarzewarszawa@gmail.com';
	const TEST_USER_ID = TEST_USER_EMAIL; // Use email as user_id
	const MEMES_DIR = path.join(__dirname, '..', 'memes');
	const INTERVAL_MINUTES = 10;
	const STORAGE_BUCKET = 'stories';

	// Get all meme files
	const files = fs.readdirSync(MEMES_DIR)
		.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
		.sort();

	console.log(`Found ${files.length} meme files\n`);

	const memes = [];
	const now = Date.now();

	for (let i = 0; i < files.length; i++) {
		const filename = files[i];
		const filePath = path.join(MEMES_DIR, filename);
		const fileBuffer = fs.readFileSync(filePath);

		// Generate unique storage path
		const storagePath = `seed-memes/${Date.now()}-${filename}`;

		console.log(`📤 Uploading ${i + 1}/${files.length}: ${filename}`);

		// Upload to Supabase Storage
		const { error: uploadError } = await supabaseAdmin.storage
			.from(STORAGE_BUCKET)
			.upload(storagePath, fileBuffer, {
				contentType: `image/${filename.split('.').pop()?.toLowerCase() === 'jpg' ? 'jpeg' : filename.split('.').pop()?.toLowerCase()}`,
				upsert: true,
			});

		if (uploadError) {
			console.error(`   ❌ Upload failed: ${uploadError.message}`);
			continue;
		}

		// Get public URL
		const { data: urlData } = supabaseAdmin.storage
			.from(STORAGE_BUCKET)
			.getPublicUrl(storagePath);

		const mediaUrl = urlData.publicUrl;

		// Extract meme name from filename for title
		const title = filename
			.replace(/^\d+_/, '') // Remove leading number
			.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') // Remove extension
			.replace(/_/g, ' ') // Replace underscores with spaces
			.replace(/\s+/g, ' ') // Normalize spaces
			.trim();

		// Determine status: all scheduled at 10-min intervals
		const scheduledTime = now + ((i + 1) * INTERVAL_MINUTES * 60 * 1000);

		memes.push({
			user_id: TEST_USER_ID,
			user_email: TEST_USER_EMAIL,
			media_url: mediaUrl,
			storage_path: storagePath,
			media_type: 'IMAGE',
			source: 'direct',
			publishing_status: 'scheduled',
			scheduled_time: scheduledTime,
			caption: title,
			title: title,
			version: 1,
			retry_count: 0,
		});
	}

	console.log(`\n📝 Inserting ${memes.length} memes into database...\n`);

	// Insert in batches of 50
	const BATCH_SIZE = 50;
	let insertedCount = 0;

	for (let i = 0; i < memes.length; i += BATCH_SIZE) {
		const batch = memes.slice(i, i + BATCH_SIZE);

		const { data, error } = await supabaseAdmin
			.from('content_items')
			.insert(batch)
			.select('id');

		if (error) {
			console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
			continue;
		}

		insertedCount += data?.length || 0;
		console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: Inserted ${data?.length || 0} memes`);
	}

	console.log('\n✨ Seeding complete!');
	console.log(`   Total uploaded & inserted: ${insertedCount}/${files.length}`);
	console.log(`   User: ${TEST_USER_EMAIL}`);
	console.log(`   First scheduled: ${new Date(now + INTERVAL_MINUTES * 60 * 1000).toLocaleString()}`);
	console.log(`   Last scheduled: ${new Date(now + (files.length * INTERVAL_MINUTES * 60 * 1000)).toLocaleString()}`);
}

seedTestMemes().catch(console.error);
