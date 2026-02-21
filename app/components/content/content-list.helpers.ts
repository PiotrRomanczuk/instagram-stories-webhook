/**
 * Helper functions and shared types for ContentList
 */

export type ViewMode = 'grid' | 'list';

/**
 * Format creator name - handles UUID fallback gracefully
 */
export function formatCreatorName(userEmail?: string): string {
	if (!userEmail) return 'Unknown';

	// Check if it looks like a UUID (incorrectly stored user_id)
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidPattern.test(userEmail)) {
		return 'Unknown';
	}

	// Extract username from email or return as-is if no @
	return userEmail.split('@')[0] || 'Unknown';
}

/**
 * Format overdue duration in human-readable form
 */
export function formatOverdueDuration(scheduledTime: number): string {
	const now = Date.now();
	const diffMs = now - scheduledTime;
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays}d`;
	}
	if (diffHours > 0) {
		return `${diffHours}h`;
	}
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	return `${diffMinutes}m`;
}
