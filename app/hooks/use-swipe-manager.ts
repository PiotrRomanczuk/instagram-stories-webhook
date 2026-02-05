/**
 * useSwipeManager Hook
 *
 * Manages swipe state for timeline cards to ensure only one card is open at a time.
 * Provides handlers for opening/closing cards and tracking the currently open card.
 */

import { useState, useCallback } from 'react';

export function useSwipeManager() {
	const [openCardId, setOpenCardId] = useState<string | null>(null);

	const openCard = useCallback((cardId: string) => {
		setOpenCardId(cardId);
	}, []);

	const closeCard = useCallback(() => {
		setOpenCardId(null);
	}, []);

	const toggleCard = useCallback(
		(cardId: string, isOpen: boolean) => {
			if (isOpen) {
				// Close other cards, open this one
				setOpenCardId(cardId);
			} else {
				// Only close if this card is the one that's open
				setOpenCardId((current) => (current === cardId ? null : current));
			}
		},
		[]
	);

	const isCardOpen = useCallback(
		(cardId: string) => openCardId === cardId,
		[openCardId]
	);

	return {
		openCardId,
		openCard,
		closeCard,
		toggleCard,
		isCardOpen,
	};
}
