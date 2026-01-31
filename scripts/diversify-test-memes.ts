/**
 * Diversify seeded memes into different statuses for testing
 */

async function diversify() {
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	console.log('🎨 Diversifying meme statuses...\n');

	// Get all seeded meme IDs
	const { data: memes } = await supabaseAdmin
		.from('content_items')
		.select('id')
		.like('storage_path', 'seed-memes/%')
		.order('created_at', { ascending: true });

	if (!memes || memes.length === 0) {
		console.log('No seeded memes found.');
		return;
	}

	const ids = memes.map(m => m.id);
	const now = Date.now();

	console.log(`Found ${ids.length} seeded memes\n`);

	// Split: 60 scheduled, 15 pending review (submissions), 10 published, 10 failed, 5 drafts
	const scheduled = ids.slice(0, 60);
	const pending = ids.slice(60, 75);
	const published = ids.slice(75, 85);
	const failed = ids.slice(85, 95);
	const drafts = ids.slice(95, 100);

	// Update pending review (submissions)
	const { error: e1 } = await supabaseAdmin
		.from('content_items')
		.update({
			source: 'submission',
			publishing_status: 'draft',
			submission_status: 'pending',
			scheduled_time: null,
		})
		.in('id', pending);
	console.log(`✅ Pending review: ${pending.length} items`, e1?.message || '');

	// Update published
	const { error: e2 } = await supabaseAdmin
		.from('content_items')
		.update({
			publishing_status: 'published',
			published_at: new Date().toISOString(),
			scheduled_time: now - 3600000,
		})
		.in('id', published);
	console.log(`✅ Published: ${published.length} items`, e2?.message || '');

	// Update failed
	const { error: e3 } = await supabaseAdmin
		.from('content_items')
		.update({
			publishing_status: 'failed',
			error: 'Test error: Instagram API returned 368 (rate limited)',
			retry_count: 3,
			scheduled_time: now - 1800000,
		})
		.in('id', failed);
	console.log(`✅ Failed: ${failed.length} items`, e3?.message || '');

	// Update drafts
	const { error: e4 } = await supabaseAdmin
		.from('content_items')
		.update({
			publishing_status: 'draft',
			scheduled_time: null,
		})
		.in('id', drafts);
	console.log(`✅ Drafts: ${drafts.length} items`, e4?.message || '');

	console.log('\n✨ Done! Refresh dashboard to see:');
	console.log('   - 60 scheduled');
	console.log('   - 15 pending review (submissions)');
	console.log('   - 10 published');
	console.log('   - 10 failed');
	console.log('   - 5 drafts');
}

diversify().catch(console.error);
