/**
 * useSwipeManager Hook
 *
 * Manages swipe state for timeline cards to ensure only one card is open at a time.
 * Provides handlers for opening/closing cards and tracking the currently open card.
 * Supports optional direction tracking for bidirectional swipe.
 */

import { useState, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right';

export function useSwipeManager() {
	const [openCardId, setOpenCardId] = useState<string | null>(null);
	const [openDirection, setOpenDirection] = useState<SwipeDirection | null>(null);

	const openCard = useCallback((cardId: string, direction?: SwipeDirection) => {
		setOpenCardId(cardId);
		setOpenDirection(direction ?? null);
	}, []);

	const closeCard = useCallback(() => {
		setOpenCardId(null);
		setOpenDirection(null);
	}, []);

	const toggleCard = useCallback(
		(cardId: string, isOpen: boolean, direction?: SwipeDirection) => {
			if (isOpen) {
				setOpenCardId(cardId);
				setOpenDirection(direction ?? null);
			} else {
				setOpenCardId((current) => {
					if (current === cardId) {
						setOpenDirection(null);
						return null;
					}
					return current;
				});
			}
		},
		[]
	);

	const isCardOpen = useCallback(
		(cardId: string) => openCardId === cardId,
		[openCardId]
	);

	const getCardDirection = useCallback(
		(cardId: string): SwipeDirection | null => {
			return openCardId === cardId ? openDirection : null;
		},
		[openCardId, openDirection]
	);

	return {
		openCardId,
		openDirection,
		openCard,
		closeCard,
		toggleCard,
		isCardOpen,
		getCardDirection,
	};
}
