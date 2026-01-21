/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLinkedFacebookAccount, saveLinkedFacebookAccount, deleteLinkedFacebookAccount, getFacebookAccessToken, getInstagramUserId } from '@/lib/database/linked-accounts';
import { supabaseAdmin } from '@/lib/config/supabase-admin';

// Mock Supabase with a chainable interface
vi.mock('@/lib/config/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(),
    } as any,
}));

describe('Linked Accounts Database', () => {
    const mockUserId = 'user-123';
    const mockAccount = {
        id: '1',
        user_id: mockUserId,
        provider: 'facebook',
        provider_account_id: 'fb-123',
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
        expires_at: Date.now() + 10000,
        ig_user_id: 'ig-789',
        created_at: '',
        updated_at: ''
    };

    // Chain helpers
    const mockEq = vi.fn();
    
    // Create the chain object first, referencing itself
    const mockChain: any = {
        select: vi.fn(), 
        eq: mockEq,
        single: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
    };

    // Ensure methods return the chain or appropriate next step
    mockChain.select.mockReturnValue(mockChain);
    mockChain.update.mockReturnValue(mockChain);
    mockChain.delete.mockReturnValue(mockChain);
    mockChain.insert.mockReturnValue(mockChain);
    
    // eq also acts as a finisher in some cases, but for chaining it returns the chain
    // But since `eq` is called AFTER `delete` or `update`, the object returned by `delete`/`update`
    // must have `eq` on it. Since `mockChain` has `eq`, returning `mockChain` works.
    mockEq.mockReturnValue(mockChain);

    beforeEach(() => {
        vi.clearAllMocks();
        (supabaseAdmin.from as any).mockReturnValue(mockChain);
        
        // Reset specific return values
        // When eq is the LAST call (like in delete/update), it needs to be awaitable and return { error: null }
        // BUT, in your code, update/delete returns { eq: ... } and then eq() is called.
        // Wait, supabase-js works like .update().eq() -> Promise
        // So eq() must return a Promise that resolves to the result.
        // HOWEVER, eq() is also chainable: .select().eq().eq().single()
        
        // Strategy: Make eq() return a Promise-like object that is ALSO the chain
        // This is tricky with simple mocks. 
        // Let's make mockChain look like a Promise
        const chainPromise = {
            ...mockChain,
            then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
        };
        
        // Update methods to return this hybrid promise-chain
        mockChain.select.mockReturnValue(chainPromise);
        mockChain.update.mockReturnValue(chainPromise);
        mockChain.delete.mockReturnValue(chainPromise);
        mockChain.insert.mockReturnValue(chainPromise);
        mockEq.mockReturnValue(chainPromise);

        // Default success for single()
        mockChain.single.mockResolvedValue({ data: mockAccount, error: null });
    });

    describe('getLinkedFacebookAccount', () => {
        it('should return account when found', async () => {
            const result = await getLinkedFacebookAccount(mockUserId);
            expect(result).toEqual(mockAccount);
            expect(supabaseAdmin.from).toHaveBeenCalledWith('linked_accounts');
            expect(mockChain.select).toHaveBeenCalledWith('*');
            expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
            expect(mockChain.eq).toHaveBeenCalledWith('provider', 'facebook');
        });

        it('should return null when no account found (PGRST116)', async () => {
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
            const result = await getLinkedFacebookAccount(mockUserId);
            expect(result).toBeNull();
        });

        it('should return null on other errors', async () => {
            mockChain.single.mockResolvedValue({ data: null, error: { code: '500', message: 'DB Error' } });
            const result = await getLinkedFacebookAccount(mockUserId);
            expect(result).toBeNull();
        });
    });

    describe('saveLinkedFacebookAccount', () => {
        it('should update existing account', async () => {
            // first call is getLinkedFacebookAccount which checks existence
            mockChain.single.mockResolvedValueOnce({ data: mockAccount, error: null });
            
            await saveLinkedFacebookAccount(mockAccount);
            
            expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
                access_token: mockAccount.access_token
            }));
            expect(mockChain.eq).toHaveBeenCalledWith('id', mockAccount.id);
        });

        it('should insert new account if none exists', async () => {
            // first call finds nothing
            mockChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

            await saveLinkedFacebookAccount(mockAccount);

            expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: mockUserId,
                provider: 'facebook'
            }));
        });

        it('should throw error if update fails', async () => {
            mockChain.single.mockResolvedValueOnce({ data: mockAccount, error: null });
            mockChain.update.mockResolvedValue({ error: { message: 'Update failed' } });

            await expect(saveLinkedFacebookAccount(mockAccount)).rejects.toThrow();
        });
    });

    describe('deleteLinkedFacebookAccount', () => {
        it('should delete account successfully', async () => {
            await deleteLinkedFacebookAccount(mockUserId);
            expect(mockChain.delete).toHaveBeenCalled();
            expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
            expect(mockChain.eq).toHaveBeenCalledWith('provider', 'facebook');
        });
    });

    describe('getFacebookAccessToken', () => {
        it('should return token if account exists and valid', async () => {
            mockChain.single.mockResolvedValue({ data: mockAccount, error: null });
            const token = await getFacebookAccessToken(mockUserId);
            expect(token).toBe(mockAccount.access_token);
        });

        it('should return null if token is expired', async () => {
            const expiredAccount = { ...mockAccount, expires_at: Date.now() - 1000 };
            mockChain.single.mockResolvedValue({ data: expiredAccount, error: null });
            
            const token = await getFacebookAccessToken(mockUserId);
            expect(token).toBeNull();
        });

        it('should return null if account does not exist', async () => {
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            const token = await getFacebookAccessToken(mockUserId);
            expect(token).toBeNull();
        });
    });

    describe('getInstagramUserId', () => {
        it('should return ig_user_id if account exists', async () => {
            mockChain.single.mockResolvedValue({ data: mockAccount, error: null });
            const id = await getInstagramUserId(mockUserId);
            expect(id).toBe(mockAccount.ig_user_id);
        });

        it('should return null if account does not exist', async () => {
            mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            const id = await getInstagramUserId(mockUserId);
            expect(id).toBeNull();
        });
    });
});
