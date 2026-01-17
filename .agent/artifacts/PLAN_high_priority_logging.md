# High-Priority Logging Implementation Plan

## Overview
This plan covers adding centralized logging (local file + Supabase) to 4 critical modules.

---

## 1. Webhook Story Endpoint
**File**: `app/api/webhook/story/route.ts`  
**Module Name**: `webhook`

### Log Points
| Event | Level | Message Template |
|-------|-------|------------------|
| Request Received | `info` | `📥 Webhook request received` |
| Auth Type | `info` | `🔐 Auth type: {session|header}` |
| User Resolution | `info` | `👤 Resolved user: {email} -> {userId}` |
| User Not Found | `error` | `❌ User not found: {email}` |
| Publish Triggered | `info` | `🚀 Publishing triggered for user {userId}` |
| Success | `info` | `✅ Webhook success: {mediaId}` |
| Failure | `error` | `❌ Webhook failed: {error}` |

### Changes Required
1. Import `Logger` from `@/lib/logger`
2. Replace all `console.log` and `console.error` with `Logger.info`/`Logger.error`
3. Add `details` object with `{ url, type, email, userId }` for traceability

---

## 2. Facebook OAuth Initiation
**File**: `app/api/auth/link-facebook/route.ts`  
**Module Name**: `auth`

### Log Points
| Event | Level | Message Template |
|-------|-------|------------------|
| Flow Started | `info` | `🔗 Facebook link flow initiated` |
| No Session | `warn` | `⚠️ No session for link-facebook, redirecting` |
| Redirect URL | `debug` | `🔀 Redirecting to Facebook: {url}` |
| Critical Error | `error` | `❌ Critical error in link-facebook: {error}` |

### Changes Required
1. Import `Logger`
2. Replace `console.log` statements
3. Log the `userId` initiating the flow for audit trail

---

## 3. Facebook OAuth Callback
**File**: `app/api/auth/link-facebook/callback/route.ts`  
**Module Name**: `auth`

### Log Points
| Event | Level | Message Template |
|-------|-------|------------------|
| Callback Received | `info` | `📥 Facebook callback received` |
| Facebook Error | `error` | `❌ Facebook OAuth error: {error}` |
| No Session | `warn` | `⚠️ No session in callback` |
| State Mismatch | `error` | `🔒 CSRF state mismatch` |
| Token Exchange Start | `info` | `🔑 Exchanging code for token...` |
| Token Exchange Success | `info` | `✅ Short-lived token obtained` |
| Long-Lived Token | `info` | `✅ Long-lived token obtained (expires: {days} days)` |
| IG Account Found | `info` | `📸 Instagram Business Account found: {igUserId}` |
| IG Account Not Found | `warn` | `⚠️ No Instagram Business Account found` |
| Link Complete | `info` | `✅ Facebook account linked for user {userId}` |
| Link Failed | `error` | `❌ Facebook linking failed: {error}` |

### Changes Required
1. Import `Logger`
2. Replace all `console.error`/`console.log` statements
3. Add structured `details` with `{ userId, facebookUserId, igUserId, expiresAt }`

---

## 4. Linked Accounts Database
**File**: `lib/linked-accounts-db.ts`  
**Module Name**: `db:accounts`

### Log Points
| Event | Level | Message Template |
|-------|-------|------------------|
| Account Fetched | `debug` | `🔍 Fetching linked account for user {userId}` |
| Account Not Found | `debug` | `ℹ️ No linked account for user {userId}` |
| Account Saved (Insert) | `info` | `💾 New Facebook account linked for user {userId}` |
| Account Saved (Update) | `info` | `🔄 Facebook account updated for user {userId}` |
| Account Deleted | `info` | `🗑️ Facebook account unlinked for user {userId}` |
| Token Expired | `warn` | `⚠️ Token expired for user {userId}` |
| DB Error | `error` | `❌ Supabase error: {operation} - {message}` |

### Changes Required
1. Import `Logger`
2. Add logging to each CRUD function
3. Ensure errors include Supabase error codes for debugging

---

## Implementation Order

1. **Step 1**: `lib/linked-accounts-db.ts` (Foundation - used by other modules)
2. **Step 2**: `app/api/auth/link-facebook/callback/route.ts` (Most complex OAuth step)
3. **Step 3**: `app/api/auth/link-facebook/route.ts` (OAuth initiation)
4. **Step 4**: `app/api/webhook/story/route.ts` (External endpoint)

---

## Verification Checklist

After implementation, verify:
- [ ] `logs/app.log` contains new entries
- [ ] `system_logs` table in Supabase has new rows
- [ ] Console output shows formatted log messages
- [ ] No TypeScript errors (`npm run build`)
- [ ] Test each flow:
  - [ ] Initiate Facebook link
  - [ ] Complete OAuth callback
  - [ ] Trigger webhook
  - [ ] Check token expiry warning

---

## Estimated Effort

| File | Lines Changed | Time |
|------|---------------|------|
| linked-accounts-db.ts | ~30 | 5 min |
| callback/route.ts | ~25 | 5 min |
| link-facebook/route.ts | ~10 | 3 min |
| webhook/story/route.ts | ~15 | 3 min |
| **Total** | ~80 | ~16 min |

