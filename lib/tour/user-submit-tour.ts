import { DriveStep } from 'driver.js';

export const userSubmitTourSteps: DriveStep[] = [
	{
		element: '[data-tour="submit-heading"]',
		popover: {
			title: 'Submit a Meme',
			description:
				'This is where you upload images or videos to be reviewed by admins and published as Instagram Stories.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="submit-upload"]',
		popover: {
			title: 'Upload Your Media',
			description:
				'Drag and drop or click to browse. Supports JPEG, PNG, and MP4 up to 50 MB. The aspect ratio will be checked automatically.',
			side: 'bottom',
			align: 'center',
		},
	},
	{
		element: '[data-tour="submit-title"]',
		popover: {
			title: 'Give It a Title',
			description:
				'A short, catchy title helps admins quickly identify your submission in the review queue.',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="submit-caption"]',
		popover: {
			title: 'Instagram Caption',
			description:
				'This caption will appear on the Instagram Story. Keep it fun and relevant!',
			side: 'bottom',
			align: 'start',
		},
	},
	{
		element: '[data-tour="submit-button"]',
		popover: {
			title: 'Submit for Review',
			description:
				'Once you have uploaded media and filled in the details, hit submit. Admins will review it and schedule it for publishing.',
			side: 'top',
			align: 'center',
		},
	},
];
