import { TOUR_VERSION } from './driver-config';

export interface TourStatus {
	tourCompleted: boolean;
	tourVersion: number;
	lastTourDate?: string;
}

// --- Page-specific tour tracking (localStorage) ---

const PAGE_TOUR_KEY = 'page-tours-v1';

function getPageTourMap(): Record<string, boolean> {
	if (typeof window === 'undefined') return {};
	try {
		const raw = localStorage.getItem(PAGE_TOUR_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function savePageTourMap(map: Record<string, boolean>): void {
	try {
		localStorage.setItem(PAGE_TOUR_KEY, JSON.stringify(map));
	} catch {
		// localStorage may be unavailable
	}
}

export function isPageTourCompleted(page: string): boolean {
	return getPageTourMap()[page] === true;
}

export function completePageTour(page: string): void {
	const map = getPageTourMap();
	map[page] = true;
	savePageTourMap(map);
}

export function resetPageTour(page: string): void {
	const map = getPageTourMap();
	delete map[page];
	savePageTourMap(map);
}

export function resetAllPageTours(): void {
	try {
		localStorage.removeItem(PAGE_TOUR_KEY);
	} catch {
		// localStorage may be unavailable
	}
}

/**
 * Check if user should see the tour
 * @param status - Tour status from API
 * @returns true if tour should be shown
 */
export function shouldShowTour(status: TourStatus | null): boolean {
	if (!status) {
		return true; // First time user
	}

	// Show if tour hasn't been completed
	if (!status.tourCompleted) {
		return true;
	}

	// Show if tour version has been updated
	if (status.tourVersion < TOUR_VERSION) {
		return true;
	}

	return false;
}

/**
 * Mark tour as completed
 */
export async function completeTour(): Promise<void> {
	try {
		await fetch('/api/tour/complete', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				tourVersion: TOUR_VERSION,
			}),
		});
	} catch (error) {
		console.error('Failed to save tour completion:', error);
	}
}

/**
 * Get tour status for current user
 */
export async function getTourStatus(): Promise<TourStatus | null> {
	try {
		const response = await fetch('/api/tour/status');
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		return data.status;
	} catch (error) {
		console.error('Failed to fetch tour status:', error);
		return null;
	}
}
