/**
 * Cleanup script to remove test memes and their storage files
 *
 * Usage: npx tsx scripts/cleanup-test-memes.ts
 */

async function cleanupTestMemes() {
	const dotenv = await import('dotenv');
	dotenv.config({ path: '.env.local' });

	const { supabaseAdmin } = await import('../lib/config/supabase-admin');

	const TEST_USER_EMAIL = 'granagitarzewarszawa@gmail.com';
	const STORAGE_BUCKET = 'stories';

	console.log('🧹 Cleaning up test memes...\n');

	// First get all memes to find storage paths
	const { data: memes, error: fetchError } = await supabaseAdmin
		.from('content_items')
		.select('id, storage_path')
		.eq('user_email', TEST_USER_EMAIL)
		.like('storage_path', 'seed-memes/%');

	if (fetchError) {
		console.error('❌ Error fetching memes:', fetchError.message);
		return;
	}

	if (!memes || memes.length === 0) {
		console.log('No test memes found to clean up.');
		return;
	}

	console.log(`Found ${memes.length} test memes to delete\n`);

	// Delete storage files
	const storagePaths = memes
		.map(m => m.storage_path)
		.filter((p): p is string => !!p);

	if (storagePaths.length > 0) {
		console.log(`🗑️ Deleting ${storagePaths.length} storage files...`);
		const { error: storageError } = await supabaseAdmin.storage
			.from(STORAGE_BUCKET)
			.remove(storagePaths);

		if (storageError) {
			console.error('⚠️ Storage cleanup error:', storageError.message);
		} else {
			console.log('✅ Storage files deleted');
		}
	}

	// Delete database records
	const { data, error } = await supabaseAdmin
		.from('content_items')
		.delete()
		.eq('user_email', TEST_USER_EMAIL)
		.like('storage_path', 'seed-memes/%')
		.select('id');

	if (error) {
		console.error('❌ Error deleting records:', error.message);
		return;
	}

	console.log(`✅ Deleted ${data?.length || 0} database records`);
	console.log('\n✨ Cleanup complete!');
}

cleanupTestMemes().catch(console.error);
