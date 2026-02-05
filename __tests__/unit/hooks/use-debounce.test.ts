import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/app/hooks/use-debounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500));
        expect(result.current).toBe('initial');
    });

    it('should debounce value changes with default delay (500ms)', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        expect(result.current).toBe('initial');

        // Update value
        rerender({ value: 'updated' });

        // Value should not change immediately
        expect(result.current).toBe('initial');

        // Fast-forward time by 499ms - should still be old value
        act(() => {
            vi.advanceTimersByTime(499);
        });
        expect(result.current).toBe('initial');

        // Fast-forward time by 1ms more (total 500ms) - should update
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe('updated');
    });

    it('should debounce value changes with custom delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 1000),
            { initialProps: { value: 'initial' } }
        );

        rerender({ value: 'updated' });

        // Should not update before delay
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('initial');

        // Should update after delay
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('updated');
    });

    it('should cancel previous timeout on rapid changes', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'initial' } }
        );

        // Rapid updates
        rerender({ value: 'update1' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'update2' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'update3' });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        // Should still be initial (only 600ms passed total, but timers reset)
        expect(result.current).toBe('initial');

        // Wait for final update (500ms from last rerender)
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current).toBe('update3');
    });

    it('should work with different data types', () => {
        // Test with numbers
        const { result: numberResult, rerender: numberRerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 0 } }
        );

        numberRerender({ value: 42 });
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(numberResult.current).toBe(42);

        // Test with booleans
        const { result: boolResult, rerender: boolRerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: false } }
        );

        boolRerender({ value: true });
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(boolResult.current).toBe(true);
    });

    it('should handle empty strings', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            { initialProps: { value: 'search query' } }
        );

        rerender({ value: '' });
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current).toBe('');
    });
});
