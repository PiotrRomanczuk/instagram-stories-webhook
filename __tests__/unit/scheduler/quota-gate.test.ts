import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContentItem } from '@/lib/types';

vi.mock('@/lib/database/linked-accounts', () => ({
	getLinkedFacebookAccount: vi.fn(),
}));

vi.mock('@/lib/instagram/quota', () => ({
	getContentPublishingLimit: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
	Logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { checkPublishingQuota } from '@/lib/scheduler/quota-gate';
import { getLinkedFacebookAccount } from '@/lib/database/linked-accounts';
import { getContentPublishingLimit } from '@/lib/instagram/quota';

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
	return {
		id: 'item-1',
		userId: 'user-1',
		userEmail: 'test@example.com',
		mediaUrl: 'https://cdn.example.com/img.jpg',
		mediaType: 'IMAGE',
		source: 'direct',
		publishingStatus: 'scheduled',
		version: 1,
		createdAt: '2026-02-01T00:00:00Z',
		updatedAt: '2026-02-01T00:00:00Z',
		...overrides,
	};
}

describe('checkPublishingQuota', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return allowed when quota has room', async () => {
		vi.mocked(getLinkedFacebookAccount).mockResolvedValue({
			id: 'acc-1',
			user_id: 'user-1',
			provider: 'facebook',
			provider_account_id: 'fb-1',
			access_token: 'tok',
			ig_user_id: 'ig-123',
			ig_username: 'test',
			created_at: '',
			updated_at: '',
		});
		vi.mocked(getContentPublishingLimit).mockResolvedValue({
			config: { quota_total: 25, quota_duration: 86400 },
			quota_usage: 5,
		});

		const result = await checkPublishingQuota([makeItem()], 2);

		expect(result.allowed).toBe(true);
		expect(result.quotaTotal).toBe(25);
		expect(result.quotaUsage).toBe(5);
		expect(result.quotaRemaining).toBe(18); // 25 - 5 - 2
	});

	it('should return not allowed when quota exhausted', async () => {
		vi.mocked(getLinkedFacebookAccount).mockResolvedValue({
			id: 'acc-1',
			user_id: 'user-1',
			provider: 'facebook',
			provider_account_id: 'fb-1',
			access_token: 'tok',
			ig_user_id: 'ig-123',
			ig_username: 'test',
			created_at: '',
			updated_at: '',
		});
		vi.mocked(getContentPublishingLimit).mockResolvedValue({
			config: { quota_total: 25, quota_duration: 86400 },
			quota_usage: 24,
		});

		const result = await checkPublishingQuota([makeItem()], 2);

		expect(result.allowed).toBe(false);
		expect(result.quotaRemaining).toBe(0);
	});

	it('should fail-open with cap=1 when quota API throws', async () => {
		vi.mocked(getLinkedFacebookAccount).mockResolvedValue({
			id: 'acc-1',
			user_id: 'user-1',
			provider: 'facebook',
			provider_account_id: 'fb-1',
			access_token: 'tok',
			ig_user_id: 'ig-123',
			ig_username: 'test',
			created_at: '',
			updated_at: '',
		});
		vi.mocked(getContentPublishingLimit).mockRejectedValue(new Error('API error'));

		const result = await checkPublishingQuota([makeItem()], 2);

		expect(result.allowed).toBe(true);
		expect(result.quotaRemaining).toBe(1);
	});

	it('should fail-open with cap=1 when no linked account', async () => {
		vi.mocked(getLinkedFacebookAccount).mockResolvedValue(null);

		const result = await checkPublishingQuota([makeItem()], 2);

		expect(result.allowed).toBe(true);
		expect(result.quotaRemaining).toBe(1);
		expect(result.igUserId).toBe('unknown');
	});

	it('should handle missing ig_user_id on linked account', async () => {
		vi.mocked(getLinkedFacebookAccount).mockResolvedValue({
			id: 'acc-1',
			user_id: 'user-1',
			provider: 'facebook',
			provider_account_id: 'fb-1',
			access_token: 'tok',
			ig_user_id: '',
			ig_username: 'test',
			created_at: '',
			updated_at: '',
		});

		const result = await checkPublishingQuota([makeItem()], 2);

		expect(result.allowed).toBe(true);
		expect(result.quotaRemaining).toBe(1);
	});
});
