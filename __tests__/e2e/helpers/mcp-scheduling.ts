/**
 * MCP Scheduling Helpers
 * Browser automation helpers using MCP Playwright server
 */

/**
 * Start browser with mobile or desktop viewport
 */
export async function startBrowser(viewport: 'mobile' | 'desktop' = 'desktop') {
	const viewports = {
		mobile: { width: 375, height: 812 }, // iPhone X
		desktop: { width: 1280, height: 720 },
	};

	return {
		viewport: viewports[viewport],
		isMobile: viewport === 'mobile',
	};
}

/**
 * Navigate to schedule page and wait for load
 */
export async function navigateToSchedule(baseUrl = 'http://localhost:3000') {
	return `${baseUrl}/schedule`;
}

/**
 * Parse accessibility snapshot to extract calendar data
 */
export function parseCalendarSnapshot(snapshot: string) {
	const timeSlots: string[] = [];
	const readyItems: string[] = [];
	const scheduledItems: string[] = [];

	// Extract time slot markers
	const slotRegex = /data-droppable-id="([^"]+)"/g;
	let match;
	while ((match = slotRegex.exec(snapshot)) !== null) {
		timeSlots.push(match[1]);
	}

	// Extract ready items
	const readyRegex = /data-draggable-id="ready-([^"]+)"/g;
	while ((match = readyRegex.exec(snapshot)) !== null) {
		readyItems.push(match[1]);
	}

	// Extract scheduled items
	const scheduledRegex = /data-item-id="([^"]+)"/g;
	while ((match = scheduledRegex.exec(snapshot)) !== null) {
		scheduledItems.push(match[1]);
	}

	return {
		timeSlots,
		readyItems,
		scheduledItems,
		hasTimeSlots: timeSlots.length > 0,
		hasReadyItems: readyItems.length > 0,
		hasScheduledItems: scheduledItems.length > 0,
	};
}

/**
 * Wait for element with retry logic
 */
export async function waitForElement(
	checkFn: () => Promise<boolean>,
	timeout = 5000,
	interval = 100
): Promise<boolean> {
	const startTime = Date.now();
	while (Date.now() - startTime < timeout) {
		if (await checkFn()) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
	return false;
}

/**
 * Extract toast message from page content
 */
export function extractToastMessage(pageContent: string): string | null {
	// Look for common toast patterns
	const toastPatterns = [
		/Scheduled for ([^<\n]+)/,
		/Rescheduled to ([^<\n]+)/,
		/Cannot reschedule/,
		/Failed to schedule/,
	];

	for (const pattern of toastPatterns) {
		const match = pageContent.match(pattern);
		if (match) {
			return match[0];
		}
	}
	return null;
}

/**
 * Parse time slot ID to extract date/time info
 */
export function parseTimeSlotId(slotId: string): {
	date: string;
	hour: number;
	minute: number;
} | null {
	const match = slotId.match(/^(\d{4}-\d{2}-\d{2})-(\d+)-(\d+)$/);
	if (!match) return null;

	return {
		date: match[1],
		hour: parseInt(match[2], 10),
		minute: parseInt(match[3], 10),
	};
}

/**
 * Generate time slot ID for specific date/time
 */
export function generateTimeSlotId(date: Date, hour: number, minute: number = 0): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}-${hour}-${minute}`;
}

/**
 * Get safe future time slot (2 hours from now or tomorrow morning)
 */
export function getSafeFutureSlot(): { date: Date; hour: number; minute: number } {
	const now = new Date();
	let targetDate = now;
	let targetHour = now.getHours() + 2;

	// If too late, schedule for tomorrow
	if (targetHour > 22) {
		targetDate = new Date(now);
		targetDate.setDate(targetDate.getDate() + 1);
		targetHour = 10; // 10 AM
	}

	// Clamp to valid range (6-23)
	targetHour = Math.max(6, Math.min(23, targetHour));

	return {
		date: targetDate,
		hour: targetHour,
		minute: 0,
	};
}

/**
 * Check if element is visible in snapshot
 */
export function isElementVisible(snapshot: string, text: string): boolean {
	return snapshot.includes(text);
}

/**
 * Extract granularity value from page content
 */
export function extractGranularityValue(pageContent: string): number | null {
	const patterns = [
		/(\d+)m/i,
		/granularity[:\s]*(\d+)/i,
	];

	for (const pattern of patterns) {
		const match = pageContent.match(pattern);
		if (match) {
			return parseInt(match[1], 10);
		}
	}
	return null;
}

/**
 * Check if mobile sidebar is visible (should be hidden on mobile)
 */
export function isSidebarVisibleOnMobile(snapshot: string): boolean {
	// Look for sidebar container with mobile-specific classes
	const hasSidebar = snapshot.includes('Ready to Schedule');
	const hasMobileHidden = snapshot.includes('hidden') || snapshot.includes('md:block');

	// On mobile, sidebar should be hidden or have mobile-hidden classes
	return hasSidebar && !hasMobileHidden;
}

/**
 * Extract modal state from snapshot
 */
export function hasOpenModal(snapshot: string): boolean {
	return (
		snapshot.includes('role="dialog"') ||
		snapshot.includes('ContentPreviewModal') ||
		snapshot.includes('ContentEditModal') ||
		snapshot.includes('QuickSchedulePopover')
	);
}

/**
 * Check if element has proper touch target size (44x44px minimum for mobile)
 */
export function hasTouchTargetSize(elementInfo: string): boolean {
	const sizeMatch = elementInfo.match(/(\d+)x(\d+)/);
	if (!sizeMatch) return false;

	const width = parseInt(sizeMatch[1], 10);
	const height = parseInt(sizeMatch[2], 10);

	// Minimum touch target: 44x44px (Apple HIG, WCAG)
	return width >= 44 && height >= 44;
}

/**
 * Validate responsive breakpoints
 */
export function validateResponsiveLayout(snapshot: string, viewport: 'mobile' | 'tablet' | 'desktop') {
	const checks = {
		mobile: {
			sidebarHidden: !snapshot.includes('aside') || snapshot.includes('hidden'),
			singleColumn: !snapshot.includes('grid-cols-2'),
			compactHeader: snapshot.includes('compact') || !snapshot.includes('expanded'),
		},
		tablet: {
			sidebarVisible: snapshot.includes('aside'),
			adaptiveGrid: true,
		},
		desktop: {
			sidebarVisible: snapshot.includes('Ready to Schedule'),
			fullFeatures: snapshot.includes('granularity') && snapshot.includes('search'),
		},
	};

	return checks[viewport];
}

/**
 * Extract console errors from browser messages
 */
export function extractConsoleErrors(consoleOutput: string): string[] {
	const errors: string[] = [];
	const lines = consoleOutput.split('\n');

	for (const line of lines) {
		if (line.includes('[ERROR]') || line.includes('error:') || line.toLowerCase().startsWith('error')) {
			errors.push(line.trim());
		}
	}

	return errors;
}

/**
 * Mobile-specific: Check if drag and drop works with touch
 */
export function supportsTouchDragDrop(snapshot: string): boolean {
	// Check for touch-action CSS or mobile DnD library
	return (
		snapshot.includes('touch-action') ||
		snapshot.includes('touchstart') ||
		snapshot.includes('mobile-drag')
	);
}

/**
 * Performance check: Extract metrics from snapshot
 */
export function extractPerformanceMetrics(snapshot: string): {
	itemCount: number;
	hasLazyLoading: boolean;
	hasVirtualization: boolean;
} {
	const itemMatches = snapshot.match(/data-item-id/g);
	const itemCount = itemMatches ? itemMatches.length : 0;

	return {
		itemCount,
		hasLazyLoading: snapshot.includes('lazy') || snapshot.includes('loading="lazy"'),
		hasVirtualization: snapshot.includes('virtual') || snapshot.includes('window-scroller'),
	};
}
