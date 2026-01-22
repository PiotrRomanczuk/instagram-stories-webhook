import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
    addScheduledPost,
    getScheduledPosts,
    updateScheduledPost,
    acquireProcessingLock,
    releaseProcessingLock
} from '@/lib/database/scheduled-posts';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import type { MediaType } from '@/lib/types'; // Assuming types definition

// Inline mock
vi.mock('@/lib/config/supabase-admin', () => {
    return {
        supabaseAdmin: {
            from: vi.fn(),
        },
    };
});

describe('Scheduled Posts DB', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Helper to setup mock chain
    const setupSupabaseMock = (responseData: unknown, errorData: unknown = null) => {
        const queryBuilder = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: responseData, error: errorData }),
            then: vi.fn((resolve) => resolve({ data: responseData, error: errorData })),
        };

        (supabaseAdmin.from as Mock).mockReturnValue(queryBuilder);
        return queryBuilder;
    };

    describe('addScheduledPost', () => {
        it('should insert post with correct fields', async () => {
            const mockQueryBuilder = setupSupabaseMock(null); // Insert returns null data usually unless select()

            // Fix types by respecting the function signature
            const postData = {
                userId: 'user_123',
                url: 'https://example.com/image.jpg',
                type: 'IMAGE' as MediaType,
                postType: 'STORY' as const,
                caption: 'Test caption',
                scheduledTime: Date.now() + 3600000,
                userTags: [],
            };

            const result = await addScheduledPost(postData);

            expect(supabaseAdmin.from).toHaveBeenCalledWith('scheduled_posts');
            expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: postData.userId,
                status: 'pending',
            }));
            expect(result.id).toBeDefined();
        });
    });

    describe('getScheduledPosts', () => {
        it('should return mapped posts', async () => {
            const mockDbPosts = [
                {
                    id: 'post_1',
                    url: 'http://url.com',
                    type: 'IMAGE',
                    post_type: 'STORY',
                    caption: 'Cap',
                    scheduled_time: 1234567890,
                    status: 'pending',
                    created_at: 1000000000,
                    user_id: 'u1',
                    user_tags: [],
                }
            ];
            setupSupabaseMock(mockDbPosts);

            const posts = await getScheduledPosts('u1');

            expect(posts).toHaveLength(1);
            expect(posts[0].id).toBe('post_1');
        });
    });

    describe('updateScheduledPost', () => {
        it('should update fields and return updated post', async () => {
            const mockUpdatedPost = {
                id: 'post_1',
                status: 'published',
                user_tags: [] // DB row structure
            };
            const qb = setupSupabaseMock(mockUpdatedPost);
            // For update logic, it often calls single() at the end
            qb.single.mockResolvedValue({ data: mockUpdatedPost, error: null });

            const result = await updateScheduledPost('post_1', { status: 'published' });

            expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'published'
            }));
            expect(result?.status).toBe('published');
        });
    });

    describe('Processing Locks', () => {
        it('acquireProcessingLock should return true if successful', async () => {
            // Mock update returning data (successful lock)
            setupSupabaseMock({ id: 'p1' });

            const success = await acquireProcessingLock('p1');
            expect(success).toBe(true);
        });

        it('acquireProcessingLock should return false if already locked', async () => {
            // Mock update returning null (no row updated due to conditions)
            setupSupabaseMock(null);

            const success = await acquireProcessingLock('p1');
            expect(success).toBe(false);
        });

        it('releaseProcessingLock should update status to pending', async () => {
            const qb = setupSupabaseMock({ id: 'p1' });

            const success = await releaseProcessingLock('p1');

            expect(success).toBe(true);
            expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'pending',
                processing_started_at: null
            }));
        });
    });
});
