/**
 * Demo seed data builder
 *
 * Shared between the CLI seed script and the /api/demo/reset route.
 * ~32 items across all statuses with a mix of IMAGE and VIDEO types.
 */

export const DEMO_EMAIL = 'demo@demo.com';
export const DEMO_USER_ID = 'test-demo-demo-com';

const SUPABASE_STORAGE_BASE =
	'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/demo';

function demoImage(name: string): string {
	return `${SUPABASE_STORAGE_BASE}/images/${name}`;
}

function demoVideo(name: string): string {
	return `${SUPABASE_STORAGE_BASE}/videos/${name}`;
}

function demoThumbnail(name: string): string {
	return `${SUPABASE_STORAGE_BASE}/thumbnails/${name}`;
}

export interface SeedItem {
	user_id: string;
	user_email: string;
	media_url: string;
	media_type: 'IMAGE' | 'VIDEO';
	thumbnail_url?: string;
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

export function buildItems(environment?: string): SeedItem[] {
	const items: SeedItem[] = [];

	const env = environment || process.env.VERCEL_ENV || 'development';

	const base = {
		user_id: DEMO_USER_ID,
		user_email: DEMO_EMAIL,
		version: 1,
		environment: env,
	};

	// 8 pending review (5 images + 3 videos)
	for (let i = 0; i < 8; i++) {
		const isVideo = i >= 5;
		items.push({
			...base,
			media_url: isVideo
				? demoVideo(`pending-${i - 4}.mp4`)
				: demoImage(`pending-${i + 1}.jpg`),
			media_type: isVideo ? 'VIDEO' : 'IMAGE',
			thumbnail_url: isVideo ? demoThumbnail(`pending-${i - 4}.jpg`) : undefined,
			source: 'submission',
			submission_status: 'pending',
			publishing_status: 'draft',
			title: `Pending ${isVideo ? 'Video' : 'Image'} #${isVideo ? i - 4 : i + 1}`,
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

	// 4 approved-unscheduled (ready to schedule)
	for (let i = 0; i < 4; i++) {
		const isVideo = i === 2;
		items.push({
			...base,
			media_url: isVideo
				? demoVideo(`approved-1.mp4`)
				: demoImage(`approved-${i + 1}.jpg`),
			media_type: isVideo ? 'VIDEO' : 'IMAGE',
			thumbnail_url: isVideo ? demoThumbnail(`approved-1.jpg`) : undefined,
			source: 'submission',
			submission_status: 'approved',
			publishing_status: 'draft',
			title: `Approved ${isVideo ? 'Video' : 'Story'} #${i + 1}`,
			caption: `Approved and ready to schedule. #approved #demo`,
			scheduled_time: null,
			published_at: null,
			ig_media_id: null,
			error: null,
			rejection_reason: null,
			reviewed_at: pastTime(i + 1),
			reviewed_by: 'admin@demo.com',
		});
	}

	// 6 scheduled future
	for (let i = 0; i < 6; i++) {
		items.push({
			...base,
			media_url: demoImage(`scheduled-${i + 1}.jpg`),
			media_type: 'IMAGE',
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

	// 3 overdue scheduled
	for (let i = 0; i < 3; i++) {
		items.push({
			...base,
			media_url: demoImage(`overdue-${i + 1}.jpg`),
			media_type: 'IMAGE',
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

	// 7 published
	for (let i = 0; i < 7; i++) {
		const pubDate = pastTime(i + 1, 14);
		items.push({
			...base,
			media_url: demoImage(`published-${i + 1}.jpg`),
			media_type: 'IMAGE',
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

	// 2 failed
	const failReasons = [
		'Instagram API error: Rate limit exceeded (code 368)',
		'Publishing failed: Access token expired (code 190)',
	];
	for (let i = 0; i < 2; i++) {
		items.push({
			...base,
			media_url: demoImage(`failed-${i + 1}.jpg`),
			media_type: 'IMAGE',
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
			media_url: demoImage(`rejected-${i + 1}.jpg`),
			media_type: 'IMAGE',
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

	return items;
}
