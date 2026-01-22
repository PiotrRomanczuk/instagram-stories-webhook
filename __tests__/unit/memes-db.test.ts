import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { 
    isEmailAllowed, 
    getUserRole, 
    createMemeSubmission, 
    getMemeSubmissions, 
    reviewMemeSubmission, 
    deleteMemeSubmission 
} from '@/lib/memes-db';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Mock Supabase admin client
vi.mock('@/lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        storage: {
            from: vi.fn(() => ({
                remove: vi.fn().mockResolvedValue({ error: null })
            }))
        }
    },
}));

describe('Memes Database Layer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const setupSupabaseMock = (responseData: any, errorData: any = null) => {
        const queryBuilder: any = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: responseData, error: errorData }),
            // Handle thenable for cases where it's called directly
            then: vi.fn((resolve) => resolve({ data: responseData, error: errorData })),
        };

        (supabaseAdmin.from as Mock).mockReturnValue(queryBuilder);
        return queryBuilder;
    };

    describe('isEmailAllowed', () => {
        it('should return true if email is in whitelist', async () => {
            setupSupabaseMock({ id: '1' });
            const result = await isEmailAllowed('test@example.com');
            expect(result).toBe(true);
            expect(supabaseAdmin.from).toHaveBeenCalledWith('allowed_users');
        });

        it('should return false if email is not in whitelist', async () => {
            setupSupabaseMock(null, { code: 'PGRST116' });
            const result = await isEmailAllowed('unknown@example.com');
            expect(result).toBe(false);
        });
    });

    describe('getUserRole', () => {
        it('should return the correct role', async () => {
            setupSupabaseMock({ role: 'admin' });
            const role = await getUserRole('admin@test.com');
            expect(role).toBe('admin');
        });

        it('should return null if user not found', async () => {
            setupSupabaseMock(null, { code: 'PGRST116' });
            const role = await getUserRole('user@test.com');
            expect(role).toBe(null);
        });
    });

    describe('createMemeSubmission', () => {
        it('should insert a new submission with pending status', async () => {
            const qb = setupSupabaseMock({ id: 'm1' });
            const input = {
                user_id: 'u1',
                user_email: 'u1@test.com',
                media_url: 'https://test.com/meme.jpg',
                title: 'Test Title'
            };

            const result = await createMemeSubmission(input);

            expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'u1',
                status: 'pending'
            }));
            expect(result?.id).toBe('m1');
        });
    });

    describe('getMemeSubmissions', () => {
        it('should apply filters correctly', async () => {
            const qb = setupSupabaseMock([{ id: 'm1', status: 'pending' }]);
            
            await getMemeSubmissions({ userId: 'u1', status: 'pending' });

            expect(qb.eq).toHaveBeenCalledWith('user_id', 'u1');
            expect(qb.eq).toHaveBeenCalledWith('status', 'pending');
        });

        it('should support array of statuses', async () => {
            const qb = setupSupabaseMock([]);
            
            await getMemeSubmissions({ status: ['approved', 'published'] });

            expect(qb.in).toHaveBeenCalledWith('status', ['approved', 'published']);
        });
    });

    describe('reviewMemeSubmission', () => {
        it('should update status and review metadata', async () => {
            const qb = setupSupabaseMock({ id: 'm1', status: 'approved' });
            
            const result = await reviewMemeSubmission('m1', 'admin1', 'approve');

            expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'approved',
                reviewed_by: 'admin1'
            }));
            expect(result?.status).toBe('approved');
        });

        it('should include rejection reason if provided', async () => {
            const qb = setupSupabaseMock({ id: 'm1', status: 'rejected' });
            
            await reviewMemeSubmission('m1', 'admin1', 'reject', 'Not funny');

            expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'rejected',
                rejection_reason: 'Not funny'
            }));
        });
    });

    describe('deleteMemeSubmission', () => {
        it('should delete from database and storage if storage_path exists', async () => {
            const qb = setupSupabaseMock({ id: 'm1', storage_path: 'memes/m1.jpg' });
            // Mock getMemeSubmission call inside delete
            qb.single.mockResolvedValueOnce({ data: { id: 'm1', storage_path: 'memes/m1.jpg' }, error: null });
            
            const result = await deleteMemeSubmission('m1');

            expect(result).toBe(true);
            expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('media');
            expect(qb.delete).toHaveBeenCalled();
        });

        it('should just delete from database if no storage_path', async () => {
            const qb = setupSupabaseMock({ id: 'm1' });
            qb.single.mockResolvedValueOnce({ data: { id: 'm1' }, error: null });

            await deleteMemeSubmission('m1');

            expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
            expect(qb.delete).toHaveBeenCalled();
        });
    });
});
