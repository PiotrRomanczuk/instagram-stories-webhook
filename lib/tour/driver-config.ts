export const TOUR_VERSION = 1;

export const driverConfig = {
	animate: true,
	padding: 10,
	allowClose: true,
	overlayClickNext: false,
	showButtons: ['next', 'previous', 'close'] as ('next' | 'previous' | 'close')[],
	showProgress: true,
	progressText: 'Step {{current}} of {{total}}',
	nextBtnText: 'Next →',
	prevBtnText: '← Back',
	doneBtnText: 'Got it!',
	closeBtnText: 'Skip',
	// Custom styles to match app theme
	popoverClass: 'tour-popover',
	overlayOpacity: 0.75,
};

export const stepDefaults = {
	popover: {
		showButtons: ['next', 'previous', 'close'],
	},
};
