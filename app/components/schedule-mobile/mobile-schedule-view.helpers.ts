import { ContentItem } from '@/lib/types/posts';
import { getHours, getMinutes } from 'date-fns';
import { getFriendlyError } from '@/lib/utils/friendly-error';

// Group items into 30-min slots
export interface TimeSlot {
	hour: number;
	halfHour: boolean;
	label: string;
	items: ContentItem[];
}

export function groupByTimeSlots(items: ContentItem[]): TimeSlot[] {
	const slots = new Map<string, TimeSlot>();
	for (const item of items) {
		if (!item.scheduledTime) continue;
		const d = new Date(item.scheduledTime);
		const h = getHours(d);
		const half = getMinutes(d) >= 30;
		const key = `${h}:${half ? '30' : '00'}`;
		if (!slots.has(key)) {
			slots.set(key, {
				hour: h, halfHour: half,
				label: `${String(h).padStart(2, '0')}:${half ? '30' : '00'}`,
				items: [],
			});
		}
		slots.get(key)!.items.push(item);
	}
	return Array.from(slots.values()).sort((a, b) =>
		a.hour !== b.hour ? a.hour - b.hour : (a.halfHour ? 1 : 0) - (b.halfHour ? 1 : 0)
	);
}

export function getDayDots(items: ContentItem[]): string[] {
	const dots: string[] = [];
	if (items.some(i => i.publishingStatus === 'scheduled')) dots.push('bg-blue-500');
	if (items.some(i => i.publishingStatus === 'published')) dots.push('bg-green-500');
	if (items.some(i => i.publishingStatus === 'failed')) dots.push('bg-red-500');
	if (items.some(i => i.publishingStatus === 'processing')) dots.push('bg-gray-300');
	return dots.slice(0, 3);
}

// Map raw API errors to friendly labels (uses shared utility)
export function friendlyError(raw: string): string {
	return getFriendlyError(raw).message;
}

export const STATUS_FILTERS = [
	{ key: 'all', label: 'All' },
	{ key: 'scheduled', label: 'Scheduled' },
	{ key: 'published', label: 'Published' },
	{ key: 'failed', label: 'Failed' },
] as const;
