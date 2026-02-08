import { DriveStep } from 'driver.js';

export const userMemesTourSteps: DriveStep[] = [
	{
		element: '[data-tour="memes-heading"]',
		popover: {
			title: 'Your Submissions',
			description:
				'This dashboard shows all the memes you have submitted. Track their status from pending review to published on Instagram.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="memes-view-toggle"]',
		popover: {
			title: 'Card or List View',
			description:
				'Switch between a visual card grid and a compact list view. Use whichever works best for you.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '[data-tour="memes-submit-new"]',
		popover: {
			title: 'Submit New Meme',
			description:
				'Tap here to open the submission form and upload a new meme for review.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '[data-tour="memes-filters"]',
		popover: {
			title: 'Search & Filter',
			description:
				'Use the search bar and status filters to quickly find specific submissions. Filter by pending, approved, rejected, or published.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="memes-card"]',
		popover: {
			title: 'Meme Card',
			description:
				'Each card shows a preview, title, and current status. Tap to see full details, edit, or delete your submission.',
			side: 'bottom',
			align: 'start',
		},
	},
];
