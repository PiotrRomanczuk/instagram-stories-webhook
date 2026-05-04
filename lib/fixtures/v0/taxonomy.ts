import type { V0Category } from './types';

export const V0_CATEGORIES: V0Category[] = [
	{ slug: 'new-year', label: 'New Year', kind: 'holiday' },
	{ slug: 'valentines', label: "Valentine's Day", kind: 'holiday' },
	{ slug: 'womens-day', label: "Women's Day (Mar 8)", kind: 'holiday' },
	{ slug: 'easter', label: 'Easter', kind: 'holiday' },
	{ slug: 'labour-day', label: 'Labour Day (May 1)', kind: 'holiday' },
	{ slug: 'constitution-day', label: 'Constitution Day (May 3)', kind: 'holiday' },
	{ slug: 'childrens-day', label: "Children's Day (Jun 1)", kind: 'holiday' },
	{ slug: 'assumption', label: 'Assumption (Aug 15)', kind: 'holiday' },
	{ slug: 'all-saints', label: 'All Saints (Nov 1)', kind: 'holiday' },
	{ slug: 'independence-day', label: 'Independence Day (Nov 11)', kind: 'holiday' },
	{ slug: 'st-nicholas', label: 'St. Nicholas (Dec 6)', kind: 'holiday' },
	{ slug: 'christmas-eve', label: 'Christmas Eve', kind: 'holiday' },
	{ slug: 'christmas', label: 'Christmas', kind: 'holiday' },
	{ slug: 'sylwester', label: 'Sylwester', kind: 'holiday' },

	{ slug: 'summer', label: 'Summer', kind: 'theme' },
	{ slug: 'winter', label: 'Winter', kind: 'theme' },
	{ slug: 'autumn', label: 'Autumn', kind: 'theme' },
	{ slug: 'spring', label: 'Spring', kind: 'theme' },
	{ slug: 'weekend-vibes', label: 'Weekend Vibes', kind: 'theme' },
	{ slug: 'monday-mood', label: 'Monday Mood', kind: 'theme' },
	{ slug: 'friday-feeling', label: 'Friday Feeling', kind: 'theme' },

	{ slug: 'vernissage', label: 'Vernissage', kind: 'event' },
	{ slug: 'exhibition', label: 'Exhibition', kind: 'event' },
	{ slug: 'marszal-meetup', label: 'Marszal Meetup', kind: 'event' },

	{ slug: 'meme', label: 'Meme', kind: 'content_type' },
	{ slug: 'bts', label: 'Behind the Scenes', kind: 'content_type' },
	{ slug: 'art', label: 'Art', kind: 'content_type' },
	{ slug: 'reel-clip', label: 'Reel Clip', kind: 'content_type' },
	{ slug: 'announcement', label: 'Announcement', kind: 'content_type' },
	{ slug: 'throwback', label: 'Throwback', kind: 'content_type' },
];

export function categoriesByKind(kind: V0Category['kind']): V0Category[] {
	return V0_CATEGORIES.filter((c) => c.kind === kind);
}

export function categoryBySlug(slug: string): V0Category | undefined {
	return V0_CATEGORIES.find((c) => c.slug === slug);
}
