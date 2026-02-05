import { DriveStep } from 'driver.js';

export const adminTourSteps: DriveStep[] = [
	{
		element: '[data-tour="admin-welcome"]',
		popover: {
			title: '👋 Welcome to Your Admin Dashboard',
			description:
				'You are an admin! This means you can review submissions, schedule posts, manage users, and monitor the entire publishing pipeline. Let us take a quick tour of the key features.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-stats-grid"]',
		popover: {
			title: '📊 Your Dashboard at a Glance',
			description:
				'Monitor everything in real-time: pending reviews, today schedule, published posts, failures, total users, and API quota. These numbers update automatically.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-stat-pending"]',
		popover: {
			title: '⏱️ Pending Review',
			description:
				'This shows how many user submissions are waiting for your approval. Click on the "Review Queue" quick action to start reviewing.',
			side: 'right',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-action-review"]',
		popover: {
			title: '✅ Review Queue',
			description:
				'Your most important task! Click here to review user-submitted content. You can approve, reject, or request changes.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-action-schedule"]',
		popover: {
			title: '📅 Schedule Manager',
			description:
				'Access the powerful calendar view to schedule approved content. Drag, drop, and manage all your posts with precise timing controls.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-action-users"]',
		popover: {
			title: '👥 User Management',
			description:
				'Add or remove users from the whitelist. Control who can submit content to your Instagram account.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-token-status"]',
		popover: {
			title: '🔑 Instagram Connection',
			description:
				'This shows if your Instagram account is properly connected. Green = good. If you see any warnings, click to reconnect your account.',
			side: 'left',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-navigation"]',
		popover: {
			title: '🧭 Navigate Your Tools',
			description:
				'Use the navigation to access Analytics, Debug tools, Settings, and more. Each section has specific admin capabilities.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="admin-help-button"]',
		popover: {
			title: '❓ Need Help?',
			description:
				'You can re-run this tour anytime by clicking the help button. You will also find links to documentation and support.',
			side: 'left',
			align: 'start',
		},
	},
];

// Conditional step for failed posts (only shown if there are failures)
export const adminFailedPostsStep: DriveStep = {
	element: '[data-tour="admin-failed-alert"]',
	popover: {
		title: '⚠️ Failed Posts',
		description:
			'When posts fail to publish, you will see an alert here. Click "View Failed" to see what went wrong and retry.',
		side: 'top',
		align: 'start',
	},
};
