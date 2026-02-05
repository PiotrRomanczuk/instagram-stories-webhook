/**
 * Feature Flags Configuration
 *
 * Centralized control for enabling/disabling features across the application.
 * Use these flags to:
 * - Gradually roll out new features
 * - Disable features in specific environments
 * - A/B test functionality
 */

export const FEATURES = {
	/**
	 * Video Upload & Processing
	 * When disabled: Hides video upload option, only allows images
	 */
	VIDEO_UPLOAD: false,

	/**
	 * Instagram Direct Messages / Inbox
	 * When disabled: Hides inbox navigation and messaging features
	 */
	INBOX_MESSAGES: false,

	/**
	 * User Tagging in Stories
	 * When disabled: Hides user tag input fields
	 */
	USER_TAGGING: false,

	/**
	 * AI-powered insights and analytics
	 * When disabled: Hides insights/analytics pages
	 */
	AI_INSIGHTS: true,

	/**
	 * Guided product tour (driver.js)
	 * When disabled: Tour will not auto-start or show trigger button
	 */
	ONBOARDING_TOUR: true,

	/**
	 * Scheduled posts timeline view
	 */
	SCHEDULE_TIMELINE: true,

	/**
	 * Real-time notifications
	 */
	NOTIFICATIONS: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
	return FEATURES[feature] === true;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
	return (Object.keys(FEATURES) as FeatureFlag[]).filter(
		(key) => FEATURES[key]
	);
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): FeatureFlag[] {
	return (Object.keys(FEATURES) as FeatureFlag[]).filter(
		(key) => !FEATURES[key]
	);
}
