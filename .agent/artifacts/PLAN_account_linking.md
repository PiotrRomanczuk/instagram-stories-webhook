# Implementation Plan: Unified Authentication with Account Linking

## Overview

**Objective**: Enable users to sign in with Google (primary identity) and link their Facebook/Instagram accounts (for API access) without session conflicts.

**Current Problem**: 
- Users authenticate with Google (NextAuth session)
- When users click "Connect Facebook", it triggers `signIn('facebook')` which **replaces** the Google session with a Facebook session
- This creates two competing authentication flows instead of one unified experience

**Solution**: Implement an **Account Linking** pattern where:
1. Google remains the sole identity provider for user authentication
2. Facebook OAuth is used only for linking Instagram API access to the authenticated user
3. Facebook tokens are stored per-user in a `linked_accounts` table

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   1. Sign In (Google)           2. Link Facebook (while logged in)   │
│   ┌─────────────┐              ┌─────────────────────────────────┐   │
│   │   Google    │──────────────▶│  NextAuth Session Created      │   │
│   │   OAuth     │              │  (user.id, user.email, etc.)    │   │
│   └─────────────┘              └─────────────────────────────────┘   │
│                                            │                          │
│                                            ▼                          │
│                                ┌─────────────────────────────────┐   │
│                                │  "Connect Facebook" Button      │   │
│                                │  (requires active session)      │   │
│                                └─────────────────────────────────┘   │
│                                            │                          │
│                                            ▼                          │
│   ┌─────────────┐              ┌─────────────────────────────────┐   │
│   │  Facebook   │◀─────────────│  /api/auth/link-facebook        │   │
│   │  OAuth      │              │  (custom OAuth flow, NOT signIn)│   │
│   └─────────────┘              └─────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  /api/auth/link-facebook/callback                            │   │
│   │  - Exchanges code for access_token                           │   │
│   │  - Fetches Instagram Business Account ID                     │   │
│   │  - Saves to linked_accounts table (keyed by user.id)         │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Table: `linked_accounts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | NextAuth user ID (from Google) |
| `provider` | text | 'facebook' |
| `provider_account_id` | text | Facebook user ID |
| `access_token` | text | Facebook access token |
| `refresh_token` | text | Optional refresh token |
| `expires_at` | bigint | Token expiry (Unix ms) |
| `ig_user_id` | text | Instagram Business Account ID |
| `created_at` | timestamp | Created timestamp |
| `updated_at` | timestamp | Last updated timestamp |

**Unique Constraint**: (`user_id`, `provider`) - One Facebook link per user

---

## Implementation Steps

### Phase 1: Database & Core Infrastructure ✅ PARTIALLY DONE

#### Step 1.1: Create Migration File ✅ DONE
- **File**: `supabase/migrations/20260116193000_linked_accounts.sql`
- **Status**: Created

#### Step 1.2: Create Linked Accounts DB Layer ✅ DONE
- **File**: `lib/linked-accounts-db.ts`
- **Status**: Created
- **Functions**:
  - `getLinkedFacebookAccount(userId)`
  - `saveLinkedFacebookAccount(account)`
  - `deleteLinkedFacebookAccount(userId)`
  - `getFacebookAccessToken(userId)`
  - `getInstagramUserId(userId)`

#### Step 1.3: Run Database Migration
- **Command**: `npx supabase db push` (or apply via Supabase Dashboard)
- **Status**: ⏳ PENDING

---

### Phase 2: Facebook OAuth Linking Flow

#### Step 2.1: Create Link Initiation Endpoint ✅ PARTIALLY DONE
- **File**: `app/api/auth/link-facebook/route.ts`
- **Status**: Created but needs session validation
- **Changes Needed**:
  - Add `getServerSession()` check to ensure user is logged in
  - Pass user ID in state parameter for callback verification

#### Step 2.2: Create Callback Handler
- **File**: `app/api/auth/link-facebook/callback/route.ts`
- **Status**: ⏳ PENDING
- **Logic**:
  1. Verify state token (CSRF protection)
  2. Get current session (must be logged in)
  3. Exchange authorization code for access token
  4. Extend to long-lived token (60 days)
  5. Fetch Instagram Business Account ID
  6. Save to `linked_accounts` table with `session.user.id`
  7. Redirect to dashboard with success message

---

### Phase 3: Update NextAuth Configuration

#### Step 3.1: Remove Facebook as Login Provider
- **File**: `app/api/auth/[...nextauth]/route.ts`
- **Changes**:
  - Remove `FacebookProvider` from providers array (Facebook should NOT be a login option)
  - Update `signIn` callback to only allow Google
  - Clean up `jwt` callback - remove Facebook token handling (moved to link flow)
  - Keep session callback for Supabase RLS JWT

#### Step 3.2: Update Session Types
- **File**: `types/next-auth.d.ts`
- **Changes**:
  - Remove `accessToken` and `igUserId` from Session type
  - These are now fetched from `linked_accounts` table per-request

---

### Phase 4: Update Frontend Components

#### Step 4.1: Update Sign-In Page
- **File**: `app/auth/signin/page.tsx`
- **Changes**:
  - Remove Facebook login button
  - Keep only Google login button
  - Update copy to reflect single sign-in method

#### Step 4.2: Update Connect Facebook Button
- **File**: `app/components/auth/connect-facebook-button.tsx`
- **Changes**:
  - Change from `signIn('facebook')` to redirect to `/api/auth/link-facebook`
  - Add session check (disable if not logged in)

#### Step 4.3: Update Home Page
- **File**: `app/page.tsx`
- **Changes**:
  - Check if user has linked Facebook account via `getLinkedFacebookAccount(session.user.id)`
  - Pass `isFacebookLinked` instead of checking `session.accessToken`

#### Step 4.4: Add Disconnect Button (Optional)
- **File**: `app/components/auth/disconnect-facebook-button.tsx`
- **Logic**: Allow users to unlink their Facebook account

---

### Phase 5: Update API Routes (Token Usage)

All API routes that use `getTokens()` need to be updated to use the new per-user model:

| File | Change Required |
|------|-----------------|
| `app/api/debug/auth/route.ts` | Get tokens by user ID from session |
| `app/api/debug/pages/route.ts` | Get tokens by user ID from session |
| `app/api/debug/fetch-pages/route.ts` | Get tokens by user ID from session |
| `app/api/extend-token/route.ts` | Get/save tokens by user ID |
| `app/api/schedule/refresh-token/route.ts` | Get/save tokens by user ID |
| `lib/instagram/publish.ts` | Accept userId parameter or get from context |

**Pattern for API routes**:
```typescript
import { getServerSession } from "next-auth/next";
import { getLinkedFacebookAccount } from "@/lib/linked-accounts-db";

export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const linkedAccount = await getLinkedFacebookAccount(session.user.id);
    if (!linkedAccount) {
        return NextResponse.json({ error: "Facebook not linked" }, { status: 400 });
    }
    
    // Use linkedAccount.access_token, linkedAccount.ig_user_id
}
```

---

### Phase 6: Migration & Cleanup

#### Step 6.1: Deprecate Global Token Storage
- **File**: `lib/db.ts`
- **Action**: Add deprecation notice, keep for backward compatibility during migration
- **Future**: Remove once all users have migrated

#### Step 6.2: Create Migration Script
- **File**: `scripts/migrate-tokens-to-linked-accounts.ts`
- **Logic**: If there's a single global token, associate it with the admin user

#### Step 6.3: Update Environment Variables
- No changes needed to `.env.local`
- Facebook credentials remain the same

---

## File Changes Summary

| File | Action | Priority |
|------|--------|----------|
| `supabase/migrations/20260116193000_linked_accounts.sql` | ✅ Created | P0 |
| `lib/linked-accounts-db.ts` | ✅ Created | P0 |
| `app/api/auth/link-facebook/route.ts` | ⚠️ Update (add session check) | P0 |
| `app/api/auth/link-facebook/callback/route.ts` | 🆕 Create | P0 |
| `app/api/auth/[...nextauth]/route.ts` | 🔄 Major refactor | P0 |
| `types/next-auth.d.ts` | 🔄 Update | P1 |
| `app/auth/signin/page.tsx` | 🔄 Remove FB button | P1 |
| `app/components/auth/connect-facebook-button.tsx` | 🔄 Update | P1 |
| `app/page.tsx` | 🔄 Update | P1 |
| `app/api/debug/auth/route.ts` | 🔄 Update | P2 |
| `app/api/debug/pages/route.ts` | 🔄 Update | P2 |
| `app/api/debug/fetch-pages/route.ts` | 🔄 Update | P2 |
| `app/api/extend-token/route.ts` | 🔄 Update | P2 |
| `app/api/schedule/refresh-token/route.ts` | 🔄 Update | P2 |
| `lib/instagram/publish.ts` | 🔄 Update | P2 |

---

## Testing Checklist

- [ ] User can sign in with Google only
- [ ] Sign-in page shows only Google option
- [ ] Logged-in user sees "Connect Facebook" button
- [ ] Clicking "Connect Facebook" opens Facebook OAuth
- [ ] After Facebook auth, user is redirected back and token is saved
- [ ] Dashboard shows "Facebook Connected" status
- [ ] Instagram API calls work with linked account token
- [ ] Token extension works for linked account
- [ ] User can disconnect Facebook account
- [ ] Logging out and back in preserves Facebook link

---

## Rollback Plan

If issues arise:
1. Revert NextAuth config to include Facebook provider
2. Keep `linked_accounts` table (no data loss)
3. Frontend can fallback to checking session.accessToken

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|---------------|
| Phase 1 (DB) | 10 min |
| Phase 2 (OAuth Flow) | 30 min |
| Phase 3 (NextAuth) | 20 min |
| Phase 4 (Frontend) | 20 min |
| Phase 5 (API Routes) | 30 min |
| Phase 6 (Cleanup) | 15 min |
| **Total** | **~2 hours** |

---

## Questions to Confirm Before Proceeding

1. **Single user or multi-user?** 
   - Current setup has `ADMIN_EMAIL` whitelist. Should we keep this restriction?
   
2. **Keep Facebook as login option?**
   - Recommended: No, use Google only for login. Facebook only for linking.
   - Alternative: Allow both, but link accounts by email matching.

3. **Backward compatibility?**
   - Should we migrate existing global token to the admin user automatically?

---

*Plan created: 2026-01-16T20:32:00+01:00*
*Status: Ready for implementation*
