import type {
	V0Submission,
	V0SubmissionStatus,
	V0SubmissionTag,
	V0PayoutStatus,
} from './types';
import { V0_ACTIVE_CONTRIBUTORS } from './contributors';
import { V0_CATEGORIES, categoriesByKind } from './taxonomy';

const PLACEHOLDER_IMG =
	'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/demo/images';
const PLACEHOLDER_VID =
	'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/demo/videos';
const PLACEHOLDER_THUMB =
	'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/demo/thumbnails';

const RATE_PER_POST = 8;

function seededRandom(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 0xffffffff;
	};
}

const rand = seededRandom(20260502);

function pick<T>(arr: T[]): T {
	return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
	const out: T[] = [];
	const pool = [...arr];
	for (let i = 0; i < n && pool.length; i++) {
		const idx = Math.floor(rand() * pool.length);
		out.push(pool.splice(idx, 1)[0]);
	}
	return out;
}

function offsetIso(now: Date, days: number, hour: number): string {
	const d = new Date(now);
	d.setUTCDate(d.getUTCDate() + days);
	d.setUTCHours(hour, Math.floor(rand() * 60), 0, 0);
	return d.toISOString();
}

function makeTags(): V0SubmissionTag[] {
	const holiday = categoriesByKind('holiday');
	const theme = categoriesByKind('theme');
	const event = categoriesByKind('event');
	const ct = categoriesByKind('content_type');

	const tags: V0SubmissionTag[] = [];
	const includeHoliday = rand() < 0.45;
	if (includeHoliday) {
		tags.push({
			categorySlug: pick(holiday).slug,
			source: 'ai',
			confidence: 0.6 + rand() * 0.35,
		});
	}
	tags.push({
		categorySlug: pick(theme).slug,
		source: 'ai',
		confidence: 0.5 + rand() * 0.4,
	});
	if (rand() < 0.2) {
		tags.push({
			categorySlug: pick(event).slug,
			source: 'contributor',
			confidence: 1,
		});
	}
	tags.push({
		categorySlug: pick(ct).slug,
		source: rand() < 0.3 ? 'curator' : 'ai',
		confidence: rand() < 0.3 ? 1 : 0.7 + rand() * 0.25,
	});
	return tags;
}

const KEYWORD_POOL = [
	'red',
	'sunset',
	'cat',
	'studio',
	'coffee',
	'street',
	'neon',
	'film',
	'analog',
	'noir',
	'pastel',
	'vinyl',
	'retro',
	'urban',
	'forest',
	'ocean',
	'rain',
	'snow',
	'sketch',
	'oil',
];

function makeKeywords(): string[] {
	return pickN(KEYWORD_POOL, 1 + Math.floor(rand() * 3));
}

function makeStatusBucket(): V0SubmissionStatus {
	const r = rand();
	if (r < 0.18) return 'pending';
	if (r < 0.32) return 'rejected';
	if (r < 0.45) return 'approved';
	if (r < 0.58) return 'scheduled';
	if (r < 0.96) return 'published';
	return 'withdrawn';
}

function buildSubmissions(): V0Submission[] {
	const out: V0Submission[] = [];
	const today = new Date('2026-05-02T08:00:00Z');
	const total = 200;

	for (let i = 0; i < total; i++) {
		const contributor = V0_ACTIVE_CONTRIBUTORS[i % V0_ACTIVE_CONTRIBUTORS.length];
		const id = `sub-${String(i + 1).padStart(3, '0')}`;
		const isVideo = rand() < 0.25;
		const status = makeStatusBucket();
		const tags = makeTags();
		const keywords = makeKeywords();
		const daysAgo = Math.floor(rand() * 28) + 1;
		const createdAt = offsetIso(today, -daysAgo, 9 + Math.floor(rand() * 8));

		const fileNum = (i % 9) + 1;
		const storageUri = isVideo
			? `${PLACEHOLDER_VID}/v0-${fileNum}.mp4`
			: `${PLACEHOLDER_IMG}/v0-${fileNum}.jpg`;
		const thumbnailUri = `${PLACEHOLDER_THUMB}/v0-${fileNum}.jpg`;

		const sub: V0Submission = {
			id,
			contributorId: contributor.id,
			mediaType: isVideo ? 'VIDEO' : 'IMAGE',
			storageUri,
			thumbnailUri,
			caption: rand() < 0.6 ? `${pick(keywords)} mood · #${pick(keywords)}` : undefined,
			holidayHint: tags.find((t) => {
				const cat = V0_CATEGORIES.find((c) => c.slug === t.categorySlug);
				return cat?.kind === 'holiday';
			})?.categorySlug,
			categories: tags,
			keywords,
			status,
			createdAt,
		};

		if (status === 'rejected') {
			sub.rejectedReason = pick([
				'Low resolution',
				'Off-brand content',
				'Duplicate',
				'Wrong format',
			]);
		}

		if (
			status === 'approved' ||
			status === 'scheduled' ||
			status === 'published'
		) {
			sub.approvedAt = offsetIso(today, -daysAgo + 1, 12);
			sub.categories = sub.categories.map((c) => ({ ...c, source: 'curator' as const }));
		}

		if (status === 'scheduled') {
			const daysAhead = Math.floor(rand() * 14) + 1;
			sub.scheduledFor = offsetIso(today, daysAhead, 8 + Math.floor(rand() * 16));
			sub.scheduleMode = rand() < 0.25 ? 'pinned' : 'auto';
			if (sub.scheduleMode === 'pinned') sub.pinnedAt = sub.scheduledFor;
		}

		if (status === 'published') {
			const pubDays = Math.max(1, daysAgo - 1);
			sub.publishedAt = offsetIso(today, -pubDays, 9 + Math.floor(rand() * 14));
			sub.igMediaId = `IG_${id}`;
			sub.payoutAmountZl = RATE_PER_POST;
			const payoutPeriod = sub.publishedAt.slice(0, 7);
			sub.payoutPeriod = payoutPeriod;
			const payoutStatus: V0PayoutStatus = pick([
				'pending',
				'pending',
				'invoiced',
				'paid',
			]);
			sub.payoutStatus = payoutStatus;
			if (rand() < 0.05) sub.payoutBonusZl = 5;
		}

		out.push(sub);
	}

	return out;
}

export const V0_SUBMISSIONS: V0Submission[] = buildSubmissions();

export function submissionsByContributor(contributorId: string): V0Submission[] {
	return V0_SUBMISSIONS.filter((s) => s.contributorId === contributorId);
}

export function submissionsByStatus(status: V0SubmissionStatus): V0Submission[] {
	return V0_SUBMISSIONS.filter((s) => s.status === status);
}

export function submissionsByCategory(slug: string): V0Submission[] {
	return V0_SUBMISSIONS.filter((s) =>
		s.categories.some((t) => t.categorySlug === slug)
	);
}
