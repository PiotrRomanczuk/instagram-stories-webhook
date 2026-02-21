const STORAGE_KEY = 'whats-new-dismissed-version';

export function getDismissedVersion(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function dismissVersion(version: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, version);
	} catch {
		// localStorage may be unavailable
	}
}

export function shouldShowWhatsNew(currentVersion: string): boolean {
	return getDismissedVersion() !== currentVersion;
}
