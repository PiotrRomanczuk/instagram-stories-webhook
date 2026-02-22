/**
 * Helper functions for ContentPreviewModal
 */

/**
 * Format creator name - handles UUID fallback gracefully
 */
export function formatCreatorName(userEmail?: string): string {
	if (!userEmail) return 'Unknown';
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidPattern.test(userEmail)) return 'Unknown';
	return userEmail.split('@')[0] || 'Unknown';
}
