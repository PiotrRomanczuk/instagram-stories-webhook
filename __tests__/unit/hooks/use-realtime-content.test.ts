import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ContentItemRow } from '@/lib/types/posts';

// Mock Supabase client - must be hoisted before imports
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@/lib/config/supabase', () => {
	const mockChannel = vi.fn(() => ({
		on: mockOn,
		subscribe: mockSubscribe,
		unsubscribe: mockUnsubscribe,
	}));

	return {
		supabase: {
			channel: mockChannel,
		},
	};
});

// Import after mocking
const { useRealtimeContent } = await import('@/app/hooks/use-realtime-content');

describe('useRealtimeContent', () => {
	const mockOnUpdate = vi.fn();
	const mockOnEvent = vi.fn();

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock the channel method to return a chainable object
		const mockChannelObj = {
			on: mockOn,
			subscribe: mockSubscribe,
			unsubscribe: mockUnsubscribe,
		};

		mockOn.mockReturnValue(mockChannelObj);
		mockSubscribe.mockReturnValue(mockChannelObj);

		const { supabase } = await import('@/lib/config/supabase');
		(supabase.channel as any).mockReturnValue(mockChannelObj);
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	it('should set up Supabase Realtime subscription', async () => {
		const { supabase } = await import('@/lib/config/supabase');

		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
			})
		);

		expect(supabase.channel).toHaveBeenCalledWith('content-changes');
		expect(mockOn).toHaveBeenCalledWith(
			'postgres_changes',
			expect.objectContaining({
				event: '*',
				schema: 'public',
				table: 'content_items',
				filter: 'scheduled_time=not.is.null',
			}),
			expect.any(Function)
		);
		expect(mockSubscribe).toHaveBeenCalled();
	});

	it('should unsubscribe on unmount', () => {
		const { unmount } = renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
			})
		);

		unmount();

		expect(mockUnsubscribe).toHaveBeenCalled();
	});

	it('should call onUpdate when content changes', () => {
		vi.useFakeTimers();

		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
				debounceMs: 100,
			})
		);

		// Get the change handler
		const changeHandler = mockOn.mock.calls[0][2];

		// Simulate a change event
		changeHandler({
			eventType: 'INSERT',
			table: 'content_items',
			new: {
				id: '1',
				scheduled_time: Date.now(),
			} as ContentItemRow,
		});

		// Wait for debounce
		vi.advanceTimersByTime(100);

		expect(mockOnUpdate).toHaveBeenCalled();

		vi.useRealTimers();
	});

	it('should call onEvent with event details', () => {
		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
				onEvent: mockOnEvent,
			})
		);

		// Get the change handler
		const changeHandler = mockOn.mock.calls[0][2];

		const newData: ContentItemRow = {
			id: '1',
			user_id: 'user-1',
			user_email: 'test@example.com',
			media_url: 'https://example.com/image.jpg',
			media_type: 'IMAGE',
			publishing_status: 'scheduled',
			scheduled_time: Date.now(),
			version: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			source: 'submission',
		};

		// Simulate INSERT event
		changeHandler({
			eventType: 'INSERT',
			table: 'content_items',
			new: newData,
		});

		expect(mockOnEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'INSERT',
				new: newData,
				timestamp: expect.any(Number),
			})
		);
	});

	it('should handle UPDATE events', () => {
		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
				onEvent: mockOnEvent,
			})
		);

		const changeHandler = mockOn.mock.calls[0][2];

		const oldData: ContentItemRow = {
			id: '1',
			user_id: 'user-1',
			user_email: 'test@example.com',
			media_url: 'https://example.com/image.jpg',
			media_type: 'IMAGE',
			publishing_status: 'scheduled',
			scheduled_time: Date.now(),
			version: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			source: 'submission',
		};

		const newData: ContentItemRow = {
			...oldData,
			publishing_status: 'published',
			version: 2,
		};

		changeHandler({
			eventType: 'UPDATE',
			table: 'content_items',
			old: oldData,
			new: newData,
		});

		expect(mockOnEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'UPDATE',
				old: oldData,
				new: newData,
			})
		);
	});

	it('should handle DELETE events', () => {
		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
				onEvent: mockOnEvent,
			})
		);

		const changeHandler = mockOn.mock.calls[0][2];

		const oldData: ContentItemRow = {
			id: '1',
			user_id: 'user-1',
			user_email: 'test@example.com',
			media_url: 'https://example.com/image.jpg',
			media_type: 'IMAGE',
			publishing_status: 'scheduled',
			scheduled_time: Date.now(),
			version: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			source: 'submission',
		};

		changeHandler({
			eventType: 'DELETE',
			table: 'content_items',
			old: oldData,
		});

		expect(mockOnEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'DELETE',
				old: oldData,
			})
		);
	});

	it('should debounce rapid updates', () => {
		vi.useFakeTimers();

		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
				debounceMs: 500,
			})
		);

		const changeHandler = mockOn.mock.calls[0][2];

		// Trigger multiple rapid changes
		changeHandler({
			eventType: 'UPDATE',
			table: 'content_items',
			new: { id: '1' } as ContentItemRow,
		});
		changeHandler({
			eventType: 'UPDATE',
			table: 'content_items',
			new: { id: '2' } as ContentItemRow,
		});
		changeHandler({
			eventType: 'UPDATE',
			table: 'content_items',
			new: { id: '3' } as ContentItemRow,
		});

		// Should not call immediately
		expect(mockOnUpdate).not.toHaveBeenCalled();

		// Advance timers partially
		vi.advanceTimersByTime(300);
		expect(mockOnUpdate).not.toHaveBeenCalled();

		// Advance to complete debounce
		vi.advanceTimersByTime(200);

		// Should be called only once
		expect(mockOnUpdate).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it('should support scheduledOnly=false to listen to all content', () => {
		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
				scheduledOnly: false,
			})
		);

		// Should not include filter
		expect(mockOn).toHaveBeenCalledWith(
			'postgres_changes',
			expect.objectContaining({
				event: '*',
				schema: 'public',
				table: 'content_items',
			}),
			expect.any(Function)
		);

		// Should not have filter property
		const callArgs = mockOn.mock.calls[0][1];
		expect(callArgs).not.toHaveProperty('filter');
	});

	it('should handle subscription status changes', () => {
		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
			})
		);

		// Get the subscribe callback
		const subscribeCallback = mockSubscribe.mock.calls[0][0];

		// Simulate SUBSCRIBED status
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		subscribeCallback('SUBSCRIBED');
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Realtime] Connected')
		);

		// Simulate error
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		subscribeCallback('CHANNEL_ERROR', new Error('Connection failed'));
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Realtime] Channel error'),
			expect.any(Error)
		);

		consoleSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it('should log content changes for debugging', async () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		renderHook(() =>
			useRealtimeContent({
				onUpdate: mockOnUpdate,
			})
		);

		const changeHandler = mockOn.mock.calls[0][2];

		changeHandler({
			eventType: 'INSERT',
			table: 'content_items',
			new: {
				id: '1',
				scheduled_time: Date.now(),
			} as ContentItemRow,
		});

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[Realtime] Content changed'),
			expect.objectContaining({
				eventType: 'INSERT',
				table: 'content_items',
			})
		);

		consoleSpy.mockRestore();
	});
});
