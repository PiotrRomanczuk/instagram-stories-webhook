import { DriveStep } from 'driver.js';

export const userTourSteps: DriveStep[] = [
	{
		element: '[data-tour="user-welcome"]',
		popover: {
			title: '👋 Hello! Welcome to Instagram Story Scheduler',
			description:
				'You can submit images and videos here, and admins will review and schedule them for Instagram. Let us show you how it works!',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="user-submit-button"]',
		popover: {
			title: '📤 Submit Your Content',
			description:
				'This is your most important button! Click here to upload images or videos for Instagram Stories. Your submissions will be reviewed by admins.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '[data-tour="user-stats-grid"]',
		popover: {
			title: '📊 Track Your Submissions',
			description:
				'See the status of all your submissions at a glance: Pending (waiting for review), Approved (ready to schedule), Scheduled (queued for posting), and Published (live on Instagram).',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="user-stat-pending"]',
		popover: {
			title: '⏱️ Pending Review',
			description:
				'After you submit content, it appears here. Admins will review it within 24-48 hours. You will be notified when it is approved or if changes are needed.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '[data-tour="user-recent-submissions"]',
		popover: {
			title: '🖼️ Your Recent Work',
			description:
				'See your latest submissions here with their current status. Click "View All" to see your complete submission history.',
			side: 'top',
			align: 'start',
		},
	},
	{
		element: '[data-tour="user-view-all"]',
		popover: {
			title: '📜 Full History',
			description:
				'Click here to see all your submissions, filter by status, and track what has been published. You can also re-run this tour anytime from the help menu.',
			side: 'left',
			align: 'start',
		},
	},
];

// Conditional step for submission card (only shown if user has submissions)
export const userSubmissionCardStep: DriveStep = {
	element: '[data-tour="user-submission-card"]',
	popover: {
		title: '📋 Submission Details',
		description:
			'Each card shows your content thumbnail, submission date, and current status. Click to see more details or make edits if it is still pending.',
		side: 'bottom',
		align: 'start',
	},
};
