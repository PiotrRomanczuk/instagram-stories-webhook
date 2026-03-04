/**
 * Seed demo data for demo@demo.com
 *
 * Creates ~40 content_items across all statuses using picsum.photos placeholders.
 * Usage: npx tsx scripts/seed-demo-data.ts
 * Cleanup: npx tsx scripts/seed-demo-data.ts --cleanup
 */

const DEMO_EMAIL = 'demo@demo.com';
const DEMO_USER_ID = 'test-demo-demo-com';

interface SeedItem {
	user_id: string;
	user_email: string;
	media_url: string;
	media_type: 'IMAGE';
	source: 'submission' | 'direct';
	submission_status: 'pending' | 'approved' | 'rejected' | null;
	publishing_status: 'draft' | 'scheduled' | 'published' | 'failed';
	title: string;
	caption: string | null;
	scheduled_time: number | null;
	published_at: string | null;
	ig_media_id: string | null;
	error: string | null;
	rejection_reason: string | null;
	reviewed_at: string | null;
	reviewed_by: string | null;
	version: number;
	environment: string;
}

function picsum(id: number): string {
	return `https://picsum.photos/id/${id}/1080/1920`;
}

function futureTime(daysFromNow: number, hour = 10): number {
	const d = new Date();
	d.setDate(d.getDate() + daysFromNow);
	d.setHours(hour, 0, 0, 0);
	return d.getTime();
}

function pastTime(daysAgo: number, hour = 14): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
}

function overdueTime(hoursAgo: number): number {
	return Date.now() - hoursAgo * 60 * 60 * 1000;
}

function buildItems(): SeedItem[] {
	const items: SeedItem[] = [];
	let picsumId = 10;

	const base = {
		user_id: DEMO_USER_ID,
		user_email: DEMO_EMAIL,
		media_type: 'IMAGE' as const,
		version: 1,
		environment: 'production',
	};

	// 10 pending review
	for (let i = 0; i < 10; i++) {
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: 'submission',
			submission_status: 'pending',
			publishing_status: 'draft',
			title: `Pending Submission #${i + 1}`,
			caption: `This submission is waiting for review. #demo #story${i + 1}`,
			scheduled_time: null,
			published_at: null,
			ig_media_id: null,
			error: null,
			rejection_reason: null,
			reviewed_at: null,
			reviewed_by: null,
		});
	}

	// 8 scheduled future
	for (let i = 0; i < 8; i++) {
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: 'direct',
			submission_status: null,
			publishing_status: 'scheduled',
			title: `Scheduled Story #${i + 1}`,
			caption: `This story is scheduled for later. #scheduled #demo`,
			scheduled_time: futureTime(i + 1, 10 + i),
			published_at: null,
			ig_media_id: null,
			error: null,
			rejection_reason: null,
			reviewed_at: null,
			reviewed_by: null,
		});
	}

	// 4 overdue scheduled
	for (let i = 0; i < 4; i++) {
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: 'direct',
			submission_status: null,
			publishing_status: 'scheduled',
			title: `Overdue Story #${i + 1}`,
			caption: `This story missed its scheduled time. #overdue`,
			scheduled_time: overdueTime((i + 1) * 3),
			published_at: null,
			ig_media_id: null,
			error: null,
			rejection_reason: null,
			reviewed_at: null,
			reviewed_by: null,
		});
	}

	// 12 published
	for (let i = 0; i < 12; i++) {
		const pubDate = pastTime(i + 1, 14);
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: i % 3 === 0 ? 'submission' : 'direct',
			submission_status: i % 3 === 0 ? 'approved' : null,
			publishing_status: 'published',
			title: `Published Story #${i + 1}`,
			caption: `This story was published successfully. #published #demo`,
			scheduled_time: new Date(pubDate).getTime() - 3600000,
			published_at: pubDate,
			ig_media_id: `demo_media_${i + 1}`,
			error: null,
			rejection_reason: null,
			reviewed_at: i % 3 === 0 ? pastTime(i + 2) : null,
			reviewed_by: i % 3 === 0 ? 'admin@demo.com' : null,
		});
	}

	// 3 failed
	const failReasons = [
		'Instagram API error: Rate limit exceeded (code 368)',
		'Media upload failed: Connection timeout after 30s',
		'Publishing failed: Access token expired (code 190)',
	];
	for (let i = 0; i < 3; i++) {
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: 'direct',
			submission_status: null,
			publishing_status: 'failed',
			title: `Failed Story #${i + 1}`,
			caption: `This story failed to publish. #failed`,
			scheduled_time: overdueTime((i + 1) * 12),
			published_at: null,
			ig_media_id: null,
			error: failReasons[i],
			rejection_reason: null,
			reviewed_at: null,
			reviewed_by: null,
		});
	}

	// 2 rejected
	const rejectReasons = [
		'Image quality too low — please resubmit at higher resolution',
		'Content does not match brand guidelines',
	];
	for (let i = 0; i < 2; i++) {
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: 'submission',
			submission_status: 'rejected',
			publishing_status: 'draft',
			title: `Rejected Submission #${i + 1}`,
			caption: null,
			scheduled_time: null,
			published_at: null,
			ig_media_id: null,
			error: null,
			rejection_reason: rejectReasons[i],
			reviewed_at: pastTime(i + 1),
			reviewed_by: 'admin@demo.com',
		});
	}

	// 5 drafts
	for (let i = 0; i < 5; i++) {
		items.push({
			...base,
			media_url: picsum(picsumId++),
			source: 'direct',
			submission_status: null,
			publishing_status: 'draft',
			title: `Draft Story #${i + 1}`,
			caption: i % 2 === 0 ? `Work in progress draft. #draft` : null,
			scheduled_time: null,
			published_at: null,
			ig_media_id: null,
			error: null,
			rejection_reason: null,
			reviewed_at: null,
			reviewed_by: null,
		});
	}

	return items;
}

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
