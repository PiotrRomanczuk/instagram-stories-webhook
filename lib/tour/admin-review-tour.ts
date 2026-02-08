import { DriveStep } from 'driver.js';

export const adminReviewTourSteps: DriveStep[] = [
	{
		element: '[data-tour="review-header"]',
		popover: {
			title: 'Story Review Queue',
			description:
				'This is where you review user-submitted content. The counter shows how many stories are waiting for your decision.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="review-phone-preview"]',
		popover: {
			title: '9:16 Phone Preview',
			description:
				'See exactly how the story will look on Instagram. The preview uses the real 9:16 aspect ratio so there are no surprises after publishing.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '[data-tour="review-action-bar"]',
		popover: {
			title: 'Approve or Reject',
			description:
				'Tap Approve to send the story to the schedule queue, or Reject to decline it. You can also use keyboard shortcuts: A to approve, R to reject.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '[data-tour="review-mobile-details"]',
		popover: {
			title: 'Details & Comment',
			description:
				'Expand this section to see submission details and leave a review comment before approving or rejecting.',
			side: 'top',
			align: 'center',
		},
	},
	{
		element: '[data-tour="review-navigation"]',
		popover: {
			title: 'Navigate Between Stories',
			description:
				'Use Previous and Skip to move through the review queue without taking action. Handy when you want to come back to a story later.',
			side: 'top',
			align: 'center',
		},
	},
];
