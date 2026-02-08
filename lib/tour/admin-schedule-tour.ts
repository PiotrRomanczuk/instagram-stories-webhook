import { DriveStep } from 'driver.js';

export const adminScheduleTourSteps: DriveStep[] = [
	{
		element: '[data-tour="schedule-date-nav"]',
		popover: {
			title: 'Date Navigation',
			description:
				'Jump between days using the arrows or tap "Today" to snap back to the current date.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="schedule-week-strip"]',
		popover: {
			title: 'Week at a Glance',
			description:
				'Tap any day to see its scheduled posts. Colored dots show the status of posts on each day: blue for scheduled, green for published, red for failed.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '[data-tour="schedule-status-filters"]',
		popover: {
			title: 'Filter by Status',
			description:
				'Quickly narrow down the timeline by tapping a status chip. Great for finding failed posts that need attention.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="schedule-timeline"]',
		popover: {
			title: 'Timeline View',
			description:
				'Posts are grouped into 30-minute time slots. Tap any card to view details, reschedule, retry, or delete.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '[data-tour="schedule-ready-button"]',
		popover: {
			title: 'Ready to Schedule',
			description:
				'Approved stories waiting to be scheduled appear here. Tap to open the Ready queue and pick time slots for them.',
			side: 'top',
			align: 'end',
		},
	},
];
