/**
 * Migration Script: scheduled_posts → content_items
 *
 * Migrates all data from the legacy scheduled_posts table to the unified content_items table.
 * This is a one-time migration that preserves all data and relationships.
 *
 * Run via: npx tsx lib/migrations/migrate-scheduled-posts.ts
 */

import { supabaseAdmin } from '../config/supabase-admin';
import { PublishingStatus, MediaType } from '../types/common';
import { getCurrentEnvironment } from '../content-db/environment';

interface ScheduledPostRow {
	id: string;
	url: string;
	type: string;
	post_type?: string;
	caption?: string;
	scheduled_time: number | string;
	status: string;
	created_at: number | string;
	published_at?: number | string | null;
	error?: string | null;
	ig_media_id?: string;
	user_tags?: { username: string; x: number; y: number }[];
	user_id: string;
	user_email?: string;
	processing_started_at?: string | null;
	content_hash?: string | null;
	idempotency_key?: string | null;
	meme_id?: string | null;
	retry_count?: number | null;
}

/**
 * Map legacy PostStatus to new PublishingStatus
 */
function mapPublishingStatus(legacyStatus: string): PublishingStatus {
	const statusMap: Record<string, PublishingStatus> = {
		PENDING: 'scheduled',
		SCHEDULED: 'scheduled',
		PROCESSING: 'processing',
		PUBLISHED: 'published',
		FAILED: 'failed',
		CANCELLED: 'draft', // Map cancelled to draft (inactive)
	};

	return statusMap[legacyStatus.toUpperCase()] || 'scheduled';
}

/**
 * Main migration function
 */
export async function migrateScheduledPosts() {
	console.log('🚀 Starting migration: scheduled_posts → content_items');
	console.log(`Environment: ${getCurrentEnvironment()}`);

	try {
		// Step 1: Fetch all scheduled posts
		console.log('\n📊 Step 1: Fetching scheduled posts...');
		const { data: scheduledPosts, error: fetchError } = await supabaseAdmin
			.from('scheduled_posts')
			.select('*')
			.order('created_at', { ascending: true });

		if (fetchError) {
			throw new Error(`Failed to fetch scheduled posts: ${fetchError.message}`);
		}

		if (!scheduledPosts || scheduledPosts.length === 0) {
			console.log('✅ No scheduled posts to migrate');
			return { success: true, migrated: 0, errors: [] };
		}

		console.log(`Found ${scheduledPosts.length} scheduled posts to migrate`);

		// Step 2: Check for existing content_items to avoid duplicates
		console.log('\n📊 Step 2: Checking for existing content items...');
		const { data: existingItems, error: existingError } = await supabaseAdmin
			.from('content_items')
			.select('idempotency_key')
			.not('idempotency_key', 'is', null);

		if (existingError) {
			console.warn('⚠️  Could not check existing items:', existingError.message);
		}

		const existingKeys = new Set(
			existingItems?.map((item) => item.idempotency_key).filter(Boolean) || []
		);

		console.log(`Found ${existingKeys.size} existing content items with idempotency keys`);

		// Step 3: Prepare content_items data
		console.log('\n📊 Step 3: Preparing content items...');
		const contentItems = scheduledPosts
			.filter((post) => {
				// Skip if already migrated (based on idempotency_key)
				if (post.idempotency_key && existingKeys.has(post.idempotency_key)) {
					console.log(`⏭️  Skipping already migrated post: ${post.id}`);
					return false;
				}
				return true;
			})
			.map((post: ScheduledPostRow) => ({
				// Use original ID to maintain relationships
				id: post.id,

				// User
				user_id: post.user_id,
				user_email: post.user_email || 'unknown@unknown.com',

				// Media
				media_url: post.url,
				media_type: (post.type || 'IMAGE').toUpperCase() as MediaType,

				// Content
				caption: post.caption,
				user_tags: post.user_tags ? JSON.stringify(post.user_tags) : null,

				// Source & Status
				source: 'direct', // All scheduled_posts are direct (not submissions)
				submission_status: null, // Not applicable
				publishing_status: mapPublishingStatus(post.status),

				// Scheduling
				scheduled_time: Number(post.scheduled_time),
				processing_started_at: post.processing_started_at,

				// Publishing
				published_at: post.published_at ? new Date(Number(post.published_at)).toISOString() : null,
				ig_media_id: post.ig_media_id,
				error: post.error,

				// Metadata
				content_hash: post.content_hash,
				idempotency_key: post.idempotency_key || `migrated-${post.id}`,
				retry_count: post.retry_count || 0,
				version: 1,

				// Environment
				environment: getCurrentEnvironment(),

				// Timestamps
				created_at: new Date(Number(post.created_at)).toISOString(),
				updated_at: new Date().toISOString(),
			}));

		if (contentItems.length === 0) {
			console.log('✅ All scheduled posts already migrated');
			return { success: true, migrated: 0, errors: [], skipped: scheduledPosts.length };
		}

		console.log(`Prepared ${contentItems.length} content items for insertion`);

		// Step 4: Insert in batches (Supabase limits bulk inserts)
		console.log('\n📊 Step 4: Inserting content items...');
		const BATCH_SIZE = 100;
		const results = { success: 0, errors: [] as string[] };

		for (let i = 0; i < contentItems.length; i += BATCH_SIZE) {
			const batch = contentItems.slice(i, i + BATCH_SIZE);
			const batchNum = Math.floor(i / BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(contentItems.length / BATCH_SIZE);

			console.log(`\n   Batch ${batchNum}/${totalBatches}: Inserting ${batch.length} items...`);

			const { data, error: insertError } = await supabaseAdmin
				.from('content_items')
				.insert(batch)
				.select('id');

			if (insertError) {
				console.error(`   ❌ Batch ${batchNum} failed:`, insertError.message);
				results.errors.push(`Batch ${batchNum}: ${insertError.message}`);

				// Try inserting one by one to identify problematic rows
				console.log(`   🔄 Attempting individual inserts for batch ${batchNum}...`);
				for (const item of batch) {
					const { error: singleError } = await supabaseAdmin
						.from('content_items')
						.insert(item)
						.select('id');

					if (singleError) {
						console.error(`   ❌ Failed to insert item ${item.id}:`, singleError.message);
						results.errors.push(`Item ${item.id}: ${singleError.message}`);
					} else {
						results.success++;
						console.log(`   ✅ Successfully inserted item ${item.id}`);
					}
				}
			} else {
				results.success += data?.length || batch.length;
				console.log(`   ✅ Batch ${batchNum} completed: ${data?.length || batch.length} items`);
			}
		}

		// Step 5: Summary
		console.log('\n' + '='.repeat(60));
		console.log('📊 MIGRATION SUMMARY');
		console.log('='.repeat(60));
		console.log(`Total scheduled posts:     ${scheduledPosts.length}`);
		console.log(`Already migrated (skipped): ${scheduledPosts.length - contentItems.length}`);
		console.log(`Attempted to migrate:       ${contentItems.length}`);
		console.log(`✅ Successfully migrated:   ${results.success}`);
		console.log(`❌ Failed to migrate:       ${results.errors.length}`);

		if (results.errors.length > 0) {
			console.log('\n⚠️  ERRORS:');
			results.errors.forEach((error, i) => {
				console.log(`   ${i + 1}. ${error}`);
			});
		}

		console.log('\n' + '='.repeat(60));

		return {
			success: results.errors.length === 0,
			migrated: results.success,
			errors: results.errors,
			skipped: scheduledPosts.length - contentItems.length,
		};
	} catch (error) {
		console.error('\n❌ Migration failed:', error);
		throw error;
	}
}

/**
 * Verify migration success
 */
export async function verifyMigration() {
	console.log('\n🔍 Verifying migration...');

	try {
		// Count scheduled_posts
		const { count: scheduledCount, error: scheduledError } = await supabaseAdmin
			.from('scheduled_posts')
			.select('*', { count: 'exact', head: true });

		if (scheduledError) throw scheduledError;

		// Count content_items with source='direct'
		const { count: contentCount, error: contentError } = await supabaseAdmin
			.from('content_items')
			.select('*', { count: 'exact', head: true })
			.eq('source', 'direct')
			.eq('environment', getCurrentEnvironment());

		if (contentError) throw contentError;

		console.log(`\nScheduled posts table:     ${scheduledCount} rows`);
		console.log(`Content items (direct):    ${contentCount} rows`);

		if (scheduledCount === contentCount) {
			console.log('✅ Verification passed: Counts match!');
			return true;
		} else {
			console.log(`⚠️  Verification warning: Counts differ by ${Math.abs((scheduledCount || 0) - (contentCount || 0))}`);
			return false;
		}
	} catch (error) {
		console.error('❌ Verification failed:', error);
		return false;
	}
}

/**
 * CLI execution
 */
if (require.main === module) {
	(async () => {
		try {
			const result = await migrateScheduledPosts();

			if (!result.success) {
				process.exit(1);
			}

			await verifyMigration();
			process.exit(0);
		} catch (error) {
			console.error('Fatal error:', error);
			process.exit(1);
		}
	})();
}
