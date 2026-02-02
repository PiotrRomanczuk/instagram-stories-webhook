'use client';

import { useEffect, useCallback } from 'react';

interface UseKeyboardNavOptions {
	onNext: () => void;
	onPrevious: () => void;
	onApprove?: () => void;
	onReject?: () => void;
	enabled?: boolean;
}

/**
 * Hook for keyboard navigation in story review
 * J or Right Arrow = Next item
 * K or Left Arrow = Previous item
 * A = Approve shortcut
 * R = Reject shortcut
 */
export function useKeyboardNav({
	onNext,
	onPrevious,
	onApprove,
	onReject,
	enabled = true,
}: UseKeyboardNavOptions) {
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!enabled) return;

			// Ignore if user is typing in an input field
			const target = event.target as HTMLElement;
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable
			) {
				return;
			}

			switch (event.key.toLowerCase()) {
				case 'j':
				case 'arrowright':
					event.preventDefault();
					onNext();
					break;
				case 'k':
				case 'arrowleft':
					event.preventDefault();
					onPrevious();
					break;
				case 'a':
					event.preventDefault();
					onApprove?.();
					break;
				case 'r':
					event.preventDefault();
					onReject?.();
					break;
			}
		},
		[enabled, onNext, onPrevious, onApprove, onReject]
	);

	useEffect(() => {
		if (!enabled) return;

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [enabled, handleKeyDown]);
}
