import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
    addScheduledPost,
    getScheduledPosts,
    getAllScheduledPosts,
    updateScheduledPost,
    deleteScheduledPost,
    deleteScheduledPosts,
    getPendingPosts,
    getUpcomingPosts,
    acquireProcessingLock,
    releaseProcessingLock
} from '@/lib/database/scheduled-posts';
import { supabaseAdmin } from '@/lib/config/supabase-admin';
import type { MediaType } from '@/lib/types';

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
            // Mock fetch returning pending status so it can be acquired
            setupSupabaseMock({ id: 'p1', status: 'pending', processing_started_at: null });

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

        it('acquireProcessingLock should handle timeout scenario', async () => {
            // Mock post that's been processing for more than 5 minutes (timeout)
            const oldTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString();
            let callCount = 0;
            const qb = {
                select: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return {
                            single: vi.fn().mockResolvedValue({
                                data: { status: 'processing', processing_started_at: oldTimestamp },
                                error: null
                            })
                        };
                    } else {
                        return Promise.resolve({ error: null });
                    }
                })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const success = await acquireProcessingLock('p1');
            expect(success).toBe(true);
        });

        it('acquireProcessingLock should return false for recent processing', async () => {
            // Mock post that's been processing for less than 5 minutes
            const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { status: 'processing', processing_started_at: recentTimestamp },
                    error: null
                })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const success = await acquireProcessingLock('p1');
            expect(success).toBe(false);
        });

        it('releaseProcessingLock should return false on error', async () => {
            const qb = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: new Error('DB error') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const success = await releaseProcessingLock('p1');
            expect(success).toBe(false);
        });
    });

    describe('getAllScheduledPosts', () => {
        it('should fetch all posts and join with user emails', async () => {
            const mockPosts = [
                { id: 'p1', user_id: 'u1', scheduled_time: 123, status: 'pending', user_tags: [] },
                { id: 'p2', user_id: 'u2', scheduled_time: 456, status: 'pending', user_tags: [] }
            ];
            const mockUsers = [
                { id: 'u1', email: 'user1@test.com' },
                { id: 'u2', email: 'user2@test.com' }
            ];

            let callCount = 0;
            const qb = {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve({ data: mockPosts, error: null });
                    } else {
                        return Promise.resolve({ data: mockPosts, error: null });
                    }
                }),
                in: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getAllScheduledPosts();

            expect(result.length).toBe(2);
            expect(qb.in).toHaveBeenCalledWith('id', ['u1', 'u2']);
        });

        it('should return empty array on error', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getAllScheduledPosts();
            expect(result).toEqual([]);
        });

        it('should handle empty posts', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [], error: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getAllScheduledPosts();
            expect(result).toEqual([]);
        });
    });

    describe('deleteScheduledPost', () => {
        it('should delete post and return true', async () => {
            const qb = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await deleteScheduledPost('p1');

            expect(result).toBe(true);
            expect(qb.delete).toHaveBeenCalled();
            expect(qb.eq).toHaveBeenCalledWith('id', 'p1');
        });

        it('should return false on error', async () => {
            const qb = {
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: new Error('DB error') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await deleteScheduledPost('p1');
            expect(result).toBe(false);
        });
    });

    describe('deleteScheduledPosts', () => {
        it('should bulk delete posts and return count', async () => {
            const qb = {
                delete: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ error: null, count: 3 })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await deleteScheduledPosts(['p1', 'p2', 'p3']);

            expect(result).toBe(3);
            expect(qb.delete).toHaveBeenCalledWith({ count: 'exact' });
            expect(qb.in).toHaveBeenCalledWith('id', ['p1', 'p2', 'p3']);
        });

        it('should return 0 on error', async () => {
            const qb = {
                delete: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ error: new Error('DB error'), count: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await deleteScheduledPosts(['p1']);
            expect(result).toBe(0);
        });

        it('should handle empty array', async () => {
            const qb = {
                delete: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ error: null, count: 0 })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await deleteScheduledPosts([]);
            expect(result).toBe(0);
        });
    });

    describe('getPendingPosts', () => {
        it('should fetch posts with scheduled_time <= now', async () => {
            const mockPosts = [
                { id: 'p1', status: 'pending', scheduled_time: Date.now() - 1000, user_tags: [] },
                { id: 'p2', status: 'pending', scheduled_time: Date.now() - 2000, user_tags: [] }
            ];
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockResolvedValue({ data: mockPosts, error: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getPendingPosts();

            expect(result.length).toBe(2);
            expect(qb.eq).toHaveBeenCalledWith('status', 'pending');
            expect(qb.lte).toHaveBeenCalledWith('scheduled_time', expect.any(Number));
        });

        it('should return empty array on error', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getPendingPosts();
            expect(result).toEqual([]);
        });

        it('should handle no pending posts', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                lte: vi.fn().mockResolvedValue({ data: [], error: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getPendingPosts();
            expect(result).toEqual([]);
        });
    });

    describe('getUpcomingPosts', () => {
        it('should fetch posts with scheduled_time > now', async () => {
            const mockPosts = [
                { id: 'p1', status: 'pending', scheduled_time: Date.now() + 1000, user_tags: [] }
            ];
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockResolvedValue({ data: mockPosts, error: null })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getUpcomingPosts();

            expect(result.length).toBe(1);
            expect(qb.eq).toHaveBeenCalledWith('status', 'pending');
            expect(qb.gt).toHaveBeenCalledWith('scheduled_time', expect.any(Number));
        });

        it('should filter by userId when provided', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockReturnThis(),
                then: vi.fn((resolve) => resolve({ data: [], error: null }))
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            await getUpcomingPosts('u1');

            expect(qb.eq).toHaveBeenCalledWith('status', 'pending');
            expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
            expect(qb.gt).toHaveBeenCalledWith('scheduled_time', expect.any(Number));
        });

        it('should return empty array on error', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gt: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getUpcomingPosts();
            expect(result).toEqual([]);
        });
    });

    describe('Edge Cases', () => {
        it('getScheduledPosts should handle database errors', async () => {
            const qb = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await getScheduledPosts('u1');
            expect(result).toEqual([]);
        });

        it('addScheduledPost should throw on database error', async () => {
            const qb = {
                insert: vi.fn().mockResolvedValue({ error: new Error('Insert failed') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            await expect(addScheduledPost({
                userId: 'u1',
                url: 'https://test.com/image.jpg',
                type: 'IMAGE' as MediaType,
                postType: 'STORY',
                scheduledTime: Date.now() + 3600000,
                userTags: []
            })).rejects.toThrow('Failed to save scheduled post to database');
        });

        it('updateScheduledPost should return null on error', async () => {
            const qb = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') })
            };
            (supabaseAdmin.from as Mock).mockReturnValue(qb);

            const result = await updateScheduledPost('p1', { status: 'published' });
            expect(result).toBe(null);
        });

        it('addScheduledPost should include userEmail if provided', async () => {
            const qb = setupSupabaseMock(null);

            await addScheduledPost({
                userId: 'u1',
                userEmail: 'user@test.com',
                url: 'https://test.com/image.jpg',
                type: 'IMAGE' as MediaType,
                postType: 'STORY',
                scheduledTime: Date.now() + 3600000,
                userTags: []
            });

            expect(qb.insert).toHaveBeenCalledWith(
                expect.objectContaining({ user_email: 'user@test.com' })
            );
        });

        it('updateScheduledPost should map all fields correctly', async () => {
            const qb = setupSupabaseMock({
                id: 'p1',
                status: 'published',
                ig_media_id: 'ig123',
                user_tags: []
            });

            await updateScheduledPost('p1', {
                status: 'published',
                igMediaId: 'ig123',
                retryCount: 2,
                contentHash: 'abc123'
            });

            expect(qb.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'published',
                    ig_media_id: 'ig123',
                    retry_count: 2,
                    content_hash: 'abc123'
                })
            );
        });
    });
});
