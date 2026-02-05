/**
 * Tests for useSwipeManager Hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeManager } from '@/app/hooks/use-swipe-manager';

describe('useSwipeManager', () => {
	it('initializes with no open card', () => {
		const { result } = renderHook(() => useSwipeManager());

		expect(result.current.openCardId).toBeNull();
		expect(result.current.isCardOpen('card-1')).toBe(false);
	});

	it('opens a card', () => {
		const { result } = renderHook(() => useSwipeManager());

		act(() => {
			result.current.openCard('card-1');
		});

		expect(result.current.openCardId).toBe('card-1');
		expect(result.current.isCardOpen('card-1')).toBe(true);
		expect(result.current.isCardOpen('card-2')).toBe(false);
	});

	it('closes the open card', () => {
		const { result } = renderHook(() => useSwipeManager());

		act(() => {
			result.current.openCard('card-1');
		});

		expect(result.current.openCardId).toBe('card-1');

		act(() => {
			result.current.closeCard();
		});

		expect(result.current.openCardId).toBeNull();
		expect(result.current.isCardOpen('card-1')).toBe(false);
	});

	it('toggles card open state', () => {
		const { result } = renderHook(() => useSwipeManager());

		// Open card-1
		act(() => {
			result.current.toggleCard('card-1', true);
		});

		expect(result.current.openCardId).toBe('card-1');

		// Close card-1
		act(() => {
			result.current.toggleCard('card-1', false);
		});

		expect(result.current.openCardId).toBeNull();
	});

	it('only allows one card open at a time', () => {
		const { result } = renderHook(() => useSwipeManager());

		// Open card-1
		act(() => {
			result.current.openCard('card-1');
		});

		expect(result.current.openCardId).toBe('card-1');

		// Open card-2 (should close card-1)
		act(() => {
			result.current.openCard('card-2');
		});

		expect(result.current.openCardId).toBe('card-2');
		expect(result.current.isCardOpen('card-1')).toBe(false);
		expect(result.current.isCardOpen('card-2')).toBe(true);
	});

	it('toggleCard closes other cards when opening a new one', () => {
		const { result } = renderHook(() => useSwipeManager());

		// Open card-1
		act(() => {
			result.current.toggleCard('card-1', true);
		});

		expect(result.current.openCardId).toBe('card-1');

		// Open card-2 via toggle
		act(() => {
			result.current.toggleCard('card-2', true);
		});

		expect(result.current.openCardId).toBe('card-2');
		expect(result.current.isCardOpen('card-1')).toBe(false);
		expect(result.current.isCardOpen('card-2')).toBe(true);
	});

	it('toggleCard with false only closes if that card is open', () => {
		const { result } = renderHook(() => useSwipeManager());

		// Open card-1
		act(() => {
			result.current.toggleCard('card-1', true);
		});

		expect(result.current.openCardId).toBe('card-1');

		// Try to close card-2 (should not affect card-1)
		act(() => {
			result.current.toggleCard('card-2', false);
		});

		expect(result.current.openCardId).toBe('card-1');

		// Close card-1
		act(() => {
			result.current.toggleCard('card-1', false);
		});

		expect(result.current.openCardId).toBeNull();
	});
});
