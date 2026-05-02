import type { V0ComposedVideo } from './types';
import { submissionsByCategory } from './submissions';

const PLACEHOLDER_VID =
	'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/demo/composed';
const PLACEHOLDER_THUMB =
	'https://urfynxrvzaysvevbcowi.supabase.co/storage/v1/object/public/stories/demo/thumbnails';

function pickPublished(slug: string, n: number): string[] {
	return submissionsByCategory(slug)
		.filter((s) => s.status === 'published')
		.slice(0, n)
		.map((s) => s.id);
}

export const V0_COMPOSED_VIDEOS: V0ComposedVideo[] = [
	{
		id: 'cv-001',
		sourceSubmissionIds: pickPublished('weekend-vibes', 6),
		durationSeconds: 38,
		storageUri: `${PLACEHOLDER_VID}/weekend-best-of.mp4`,
		thumbnailUri: `${PLACEHOLDER_THUMB}/cv-001.jpg`,
		caption: 'weekend best-of · marszal arts',
		status: 'published',
		tikTokPublishStatus: 'published',
		createdAt: '2026-04-25T18:00:00Z',
		publishedAt: '2026-04-26T10:30:00Z',
		tikTokRef: 'tt_pub_abc123',
	},
	{
		id: 'cv-002',
		sourceSubmissionIds: pickPublished('summer', 5),
		durationSeconds: 45,
		storageUri: `${PLACEHOLDER_VID}/summer-mood.mp4`,
		thumbnailUri: `${PLACEHOLDER_THUMB}/cv-002.jpg`,
		caption: 'summer in marszal',
		status: 'completed',
		tikTokPublishStatus: 'draft',
		createdAt: '2026-04-29T12:00:00Z',
	},
	{
		id: 'cv-003',
		sourceSubmissionIds: pickPublished('art', 4),
		durationSeconds: 22,
		storageUri: `${PLACEHOLDER_VID}/art-loop.mp4`,
		thumbnailUri: `${PLACEHOLDER_THUMB}/cv-003.jpg`,
		caption: 'art reel',
		status: 'completed',
		tikTokPublishStatus: 'draft',
		createdAt: '2026-05-01T09:00:00Z',
	},
	{
		id: 'cv-004',
		sourceSubmissionIds: pickPublished('bts', 3),
		durationSeconds: 30,
		storageUri: `${PLACEHOLDER_VID}/bts-cut.mp4`,
		thumbnailUri: `${PLACEHOLDER_THUMB}/cv-004.jpg`,
		caption: 'bts cut · drop 03',
		status: 'processing',
		createdAt: '2026-05-02T07:30:00Z',
	},
	{
		id: 'cv-005',
		sourceSubmissionIds: pickPublished('throwback', 4),
		durationSeconds: 50,
		storageUri: `${PLACEHOLDER_VID}/throwback-mix.mp4`,
		thumbnailUri: `${PLACEHOLDER_THUMB}/cv-005.jpg`,
		caption: 'throwback mix',
		status: 'failed',
		createdAt: '2026-05-01T22:00:00Z',
	},
];
