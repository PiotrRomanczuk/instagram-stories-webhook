import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/app/hooks/use-media-query';

describe('useMediaQuery', () => {
    let matchMediaMock: {
        matches: boolean;
        media: string;
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
        addListener: ReturnType<typeof vi.fn>;
        removeListener: ReturnType<typeof vi.fn>;
        dispatchEvent: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        matchMediaMock = {
            matches: false,
            media: '',
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };

        window.matchMedia = vi.fn().mockImplementation((query) => ({
            ...matchMediaMock,
            media: query,
        }));
    });

    it('should return false initially when media query does not match', () => {
        matchMediaMock.matches = false;
        const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(result.current).toBe(false);
    });

    it('should return true initially when media query matches', () => {
        matchMediaMock.matches = true;
        const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
        expect(result.current).toBe(true);
    });

    it('should update when media query changes', () => {
        matchMediaMock.matches = false;
        const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

        expect(result.current).toBe(false);

        // Simulate media query change: update mock return value, then fire listener
        act(() => {
            matchMediaMock.matches = true;
            const changeHandler = matchMediaMock.addEventListener.mock.calls[0][1];
            changeHandler();
        });

        expect(result.current).toBe(true);
    });

    it('should add and remove event listener', () => {
        const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

        expect(matchMediaMock.addEventListener).toHaveBeenCalledWith(
            'change',
            expect.any(Function)
        );

        unmount();

        expect(matchMediaMock.removeEventListener).toHaveBeenCalledWith(
            'change',
            expect.any(Function)
        );
    });

    it('should work with different media queries', () => {
        // Desktop
        matchMediaMock.matches = true;
        const { result: desktopResult } = renderHook(() =>
            useMediaQuery('(min-width: 768px)')
        );
        expect(desktopResult.current).toBe(true);

        // Mobile
        matchMediaMock.matches = false;
        const { result: mobileResult } = renderHook(() =>
            useMediaQuery('(max-width: 767px)')
        );
        expect(mobileResult.current).toBe(false);

        // Dark mode
        matchMediaMock.matches = true;
        const { result: darkModeResult } = renderHook(() =>
            useMediaQuery('(prefers-color-scheme: dark)')
        );
        expect(darkModeResult.current).toBe(true);
    });

    it('should update when query prop changes', () => {
        matchMediaMock.matches = true;
        const { result, rerender } = renderHook(
            ({ query }) => useMediaQuery(query),
            { initialProps: { query: '(min-width: 768px)' } }
        );

        expect(result.current).toBe(true);

        // Change query
        matchMediaMock.matches = false;
        rerender({ query: '(max-width: 767px)' });

        expect(result.current).toBe(false);
    });
});
