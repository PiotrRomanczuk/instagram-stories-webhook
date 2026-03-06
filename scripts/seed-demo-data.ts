/**
 * Seed demo data for demo@demo.com
 *
 * Creates ~32 content_items across all statuses using Supabase Storage URLs.
 * Includes both IMAGE and VIDEO items with proper thumbnails.
 * Usage: npx tsx scripts/seed-demo-data.ts
 * Cleanup: npx tsx scripts/seed-demo-data.ts --cleanup
 */

import { DEMO_EMAIL, buildItems } from '../lib/demo/seed-items';

async function seed() {
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	console.log('Seeding demo data for', DEMO_EMAIL);

	// Clean up existing demo data first
	const { error: deleteError } = await supabaseAdmin
		.from('content_items')
		.delete()
		.eq('user_email', DEMO_EMAIL);

	if (deleteError) {
		console.error('Failed to clean up existing demo data:', deleteError.message);
		return;
	}

	const items = buildItems();
	console.log(`Inserting ${items.length} demo content items...`);

	const { error: insertError } = await supabaseAdmin
		.from('content_items')
		.insert(items);

	if (insertError) {
		console.error('Failed to insert demo data:', insertError.message);
		return;
	}

	console.log(`Done! ${items.length} demo items created.`);
}

async function cleanup() {
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	console.log('Cleaning up demo data for', DEMO_EMAIL);

	const { data, error } = await supabaseAdmin
		.from('content_items')
		.delete()
		.eq('user_email', DEMO_EMAIL)
		.select('id');

	if (error) {
		console.error('Failed to clean up:', error.message);
		return;
	}

	console.log(`Removed ${data?.length || 0} demo items.`);
}

const isCleanup = process.argv.includes('--cleanup');
if (isCleanup) {
	cleanup();
} else {
	seed();
}
