import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
	getSystemSetting,
	getBooleanSetting,
	setSystemSetting,
	SETTING_KEYS,
} from '@/lib/supabase/system-settings';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

vi.mock('@/lib/config/supabase-admin', () => ({
	supabaseAdmin: {
		from: vi.fn(),
	},
}));

const mockFrom = supabaseAdmin.from as Mock;

function mockSelect(data: { value: string } | null, error: unknown = null) {
	mockFrom.mockReturnValue({
		select: vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data, error }),
			}),
		}),
	});
}

function mockUpsert(error: unknown = null) {
	mockFrom.mockReturnValue({
		upsert: vi.fn().mockResolvedValue({ error }),
	});
}

describe('system-settings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSystemSetting', () => {
		it('returns the value when setting exists', async () => {
			mockSelect({ value: 'hello' });
			const result = await getSystemSetting('test_key');
			expect(result).toBe('hello');
			expect(mockFrom).toHaveBeenCalledWith('system_settings');
		});

		it('returns default value when setting not found', async () => {
			mockSelect(null, { message: 'not found' });
			const result = await getSystemSetting('missing_key', 'fallback');
			expect(result).toBe('fallback');
		});

		it('returns empty string default when no default provided', async () => {
			mockSelect(null, { message: 'not found' });
			const result = await getSystemSetting('missing_key');
			expect(result).toBe('');
		});
	});

	describe('getBooleanSetting', () => {
		it('returns true when value is "true"', async () => {
			mockSelect({ value: 'true' });
			const result = await getBooleanSetting('flag');
			expect(result).toBe(true);
		});

		it('returns false when value is "false"', async () => {
			mockSelect({ value: 'false' });
			const result = await getBooleanSetting('flag');
			expect(result).toBe(false);
		});

		it('returns false for non-boolean strings', async () => {
			mockSelect({ value: 'yes' });
			const result = await getBooleanSetting('flag');
			expect(result).toBe(false);
		});

		it('returns default value when setting not found', async () => {
			mockSelect(null, { message: 'not found' });
			const result = await getBooleanSetting('missing', true);
			expect(result).toBe(true);
		});

		it('defaults to false when no default provided', async () => {
			mockSelect(null, { message: 'not found' });
			const result = await getBooleanSetting('missing');
			expect(result).toBe(false);
		});
	});

	describe('setSystemSetting', () => {
		it('upserts the setting with updated_at and updated_by', async () => {
			mockUpsert();
			await setSystemSetting('my_key', 'my_value', 'admin@test.com');

			expect(mockFrom).toHaveBeenCalledWith('system_settings');
			const upsertCall = mockFrom.mock.results[0].value.upsert;
			expect(upsertCall).toHaveBeenCalledWith(
				expect.objectContaining({
					key: 'my_key',
					value: 'my_value',
					updated_by: 'admin@test.com',
				}),
				{ onConflict: 'key' }
			);
		});

		it('defaults updated_by to "system"', async () => {
			mockUpsert();
			await setSystemSetting('key', 'val');

			const upsertCall = mockFrom.mock.results[0].value.upsert;
			expect(upsertCall).toHaveBeenCalledWith(
				expect.objectContaining({ updated_by: 'system' }),
				{ onConflict: 'key' }
			);
		});

		it('throws on database error', async () => {
			mockUpsert({ message: 'db error' });
			await expect(
				setSystemSetting('key', 'val')
			).rejects.toThrow('Failed to update setting "key": db error');
		});
	});

	describe('SETTING_KEYS', () => {
		it('has expected keys', () => {
			expect(SETTING_KEYS.PUBLISHING_ENABLED).toBe('publishing_enabled');
			expect(SETTING_KEYS.AUTO_PROCESS_VIDEOS).toBe('auto_process_videos');
		});
	});
});
