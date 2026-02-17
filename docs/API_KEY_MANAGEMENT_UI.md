# API Key Management UI - Implementation Plan

**Status:** Planned for v0.22.0
**Priority:** High
**Depends on:** PR #71 (iPhone Widget with API Key Authentication)

---

## Overview

Build a complete UI for managing API keys in the developer dashboard. Currently, API keys must be generated via database or Node REPL. This will provide a user-friendly interface for developers to manage their API keys.

---

## User Stories

1. **As a developer**, I want to generate new API keys with a single click
2. **As a developer**, I want to see all my active API keys in one place
3. **As a developer**, I want to revoke API keys that I no longer need
4. **As a developer**, I want to name my API keys so I know which device uses which key
5. **As a developer**, I want to see when each key was last used
6. **As a developer**, I want to set expiration dates on keys for security

---

## UI Mockup

### Location
Add new tab/section to `/developer` page:
```
Developer Tools
├── Debug Publisher
├── Story Preview
├── API Configuration
├── Cron Job Debugger
└── API Keys ← NEW
```

### Components Needed

#### 1. API Keys List Card
```
┌─────────────────────────────────────────────────────┐
│ 🔑 API Keys                    [+ Generate New Key] │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ 📱 iPhone Widget                             │   │
│ │ sk_live_abc123de...              [Revoke]    │   │
│ │ Created: 2 days ago                          │   │
│ │ Last used: 5 minutes ago                     │   │
│ │ Scopes: cron:read, logs:read                 │   │
│ │ Expires: Never                               │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ 💻 iPad Widget                               │   │
│ │ sk_live_xyz789ab...              [Revoke]    │   │
│ │ Created: 1 week ago                          │   │
│ │ Last used: Never                             │   │
│ │ Scopes: cron:read, logs:read                 │   │
│ │ Expires: 2026-08-17                          │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### 2. Generate API Key Dialog
```
┌─────────────────────────────────────────────────────┐
│ Generate New API Key                          [✕]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Name (optional)                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ iPhone Widget                                │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Scopes                                               │
│ ☑ cron:read    - Read cron job status               │
│ ☑ logs:read    - Read system logs                   │
│                                                      │
│ Expiration (optional)                                │
│ ○ Never expire                                       │
│ ○ Expire in 3 months                                 │
│ ○ Expire in 6 months                                 │
│ ○ Custom date: [2026-12-31]                          │
│                                                      │
│                       [Cancel]  [Generate Key]       │
└─────────────────────────────────────────────────────┘
```

#### 3. API Key Generated Success Dialog
```
┌─────────────────────────────────────────────────────┐
│ ✅ API Key Generated Successfully            [✕]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ⚠️ IMPORTANT: Copy this key now!                    │
│ It will only be shown once and cannot be retrieved. │
│                                                      │
│ Your API Key:                                        │
│ ┌──────────────────────────────────────────────┐   │
│ │ sk_live_abc123def456ghi789jkl012mno345pqr678│ 📋 │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Quick Start:                                         │
│ 1. Copy the key above                                │
│ 2. Open Scriptable app on your iPhone                │
│ 3. Update API_KEY in the widget script               │
│ 4. Test at /test-api-key                             │
│                                                      │
│ Need help? See the setup guide: [View Docs]          │
│                                                      │
│                                         [Done]       │
└─────────────────────────────────────────────────────┘
```

#### 4. Revoke Confirmation Dialog
```
┌─────────────────────────────────────────────────────┐
│ Revoke API Key?                               [✕]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Are you sure you want to revoke this API key?       │
│                                                      │
│ Name: iPhone Widget                                  │
│ Prefix: sk_live_abc123de...                          │
│                                                      │
│ ⚠️ This action cannot be undone.                     │
│ Any apps using this key will stop working.          │
│                                                      │
│                       [Cancel]  [Revoke Key]         │
└─────────────────────────────────────────────────────┘
```

---

## API Routes to Create

### 1. Generate API Key
```typescript
POST /api/developer/api-keys/generate

Request Body:
{
  "name": "iPhone Widget",
  "scopes": ["cron:read", "logs:read"],
  "expiresAt": "2027-01-01T00:00:00Z" // optional
}

Response:
{
  "key": "sk_live_abc123...", // Full key, shown only once
  "apiKey": {
    "id": "uuid",
    "keyPrefix": "sk_live_abc123de",
    "name": "iPhone Widget",
    "scopes": ["cron:read", "logs:read"],
    "createdAt": "2026-02-17T14:00:00.000Z",
    "expiresAt": "2027-01-01T00:00:00Z"
  }
}
```

### 2. List API Keys
```typescript
GET /api/developer/api-keys

Response:
{
  "apiKeys": [
    {
      "id": "uuid",
      "keyPrefix": "sk_live_abc123de",
      "name": "iPhone Widget",
      "scopes": ["cron:read", "logs:read"],
      "lastUsedAt": "2026-02-17T13:55:00.000Z",
      "expiresAt": null,
      "createdAt": "2026-02-15T10:00:00.000Z"
    }
  ]
}
```

### 3. Revoke API Key
```typescript
DELETE /api/developer/api-keys/:keyId

Response:
{
  "success": true,
  "message": "API key revoked successfully"
}
```

### 4. Update API Key (optional)
```typescript
PATCH /api/developer/api-keys/:keyId

Request Body:
{
  "name": "Updated Name",
  "scopes": ["cron:read", "logs:read"]
}

Response:
{
  "apiKey": { /* updated key */ }
}
```

---

## Implementation Steps

### Phase 1: API Routes (Backend)
1. Create `/api/developer/api-keys/generate/route.ts`
   - Validate user session (requireDeveloper)
   - Generate API key using existing utilities
   - Save to database
   - Return full key + metadata

2. Create `/api/developer/api-keys/route.ts`
   - GET: List user's API keys
   - Validate session
   - Fetch from database
   - Return sanitized list (no hashes)

3. Create `/api/developer/api-keys/[keyId]/route.ts`
   - DELETE: Revoke key
   - PATCH: Update key metadata
   - Validate ownership
   - Update database

### Phase 2: React Components (Frontend)
1. Create `app/components/developer/api-keys-manager.tsx`
   - Main container component
   - Fetches and displays API keys
   - Handles state management

2. Create `app/components/developer/api-key-card.tsx`
   - Individual key display
   - Shows prefix, name, scopes, last used
   - Revoke button

3. Create `app/components/developer/generate-api-key-dialog.tsx`
   - Dialog for generating new keys
   - Form with name, scopes, expiration
   - Handles API call

4. Create `app/components/developer/api-key-success-dialog.tsx`
   - Shows generated key (once)
   - Copy to clipboard button
   - Setup instructions

### Phase 3: Integration
1. Add API Keys section to `/app/[locale]/developer/page.tsx`
   - Import ApiKeysManager component
   - Position below Cron Debug card

2. Add navigation/tab system (optional)
   - Tab bar: Debug | Cron | API Keys
   - Better organization for multiple tools

### Phase 4: Testing
1. Unit tests for API routes
   - Test key generation
   - Test listing keys
   - Test revocation
   - Test authorization

2. Integration tests
   - Test full flow: generate → use → revoke
   - Test with real Supabase

3. E2E tests (optional)
   - Test UI flow in browser
   - Generate key via UI
   - Test on /test-api-key page

---

## Files to Create

```
API Routes:
  app/api/developer/api-keys/generate/route.ts
  app/api/developer/api-keys/route.ts
  app/api/developer/api-keys/[keyId]/route.ts

Components:
  app/components/developer/api-keys-manager.tsx
  app/components/developer/api-key-card.tsx
  app/components/developer/generate-api-key-dialog.tsx
  app/components/developer/api-key-success-dialog.tsx

Tests:
  __tests__/api/developer/api-keys.test.ts
  __tests__/unit/components/api-keys-manager.test.tsx

Updated Files:
  app/[locale]/developer/page.tsx (add ApiKeysManager)
```

---

## Security Considerations

### API Routes
- ✅ Validate session with `requireDeveloper()`
- ✅ Verify user owns the API key before operations
- ✅ Never return key hashes in responses
- ✅ Rate limit key generation (max 10 keys per user?)
- ✅ Log all key operations (generate, revoke)

### Frontend
- ✅ Show full key only once (in success dialog)
- ✅ Clear key from memory after dialog closes
- ✅ Warn user before revoking keys
- ✅ Display last used timestamp for audit
- ✅ Highlight expired or soon-to-expire keys

### Database
- ✅ RLS policies already in place (from migration)
- ✅ Users can only manage their own keys
- ✅ Service role for admin operations

---

## User Experience Enhancements

### 1. Copy to Clipboard
```typescript
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('API key copied to clipboard!');
}
```

### 2. QR Code Generator (Future)
Generate QR code for easy widget setup:
```typescript
import QRCode from 'qrcode';

const qrData = {
  apiUrl: 'https://your-app.vercel.app',
  apiKey: 'sk_live_...',
};

const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
// Display QR code for user to scan with Scriptable app
```

### 3. Usage Analytics (Future)
Show usage stats for each key:
- Total requests in last 24h
- Last 10 requests with timestamps
- Most common endpoints accessed
- Chart of usage over time

### 4. Key Rotation Helper (Future)
Automated key rotation workflow:
1. Generate new key
2. Update configuration in apps
3. Test new key
4. Revoke old key

---

## Testing Checklist

- [ ] Generate API key via UI
- [ ] Copy key to clipboard works
- [ ] List shows all user's keys
- [ ] Last used timestamp updates correctly
- [ ] Revoke key works
- [ ] Revoked key cannot be used
- [ ] Expired key cannot be used
- [ ] Cannot revoke another user's key
- [ ] Cannot list another user's keys
- [ ] Rate limiting works (if implemented)
- [ ] Mobile responsive design
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

---

## Rollout Plan

### v0.22.0 Release
1. **Phase 1:** API routes only (backend)
   - Users can generate keys via API calls
   - Developers can test without UI

2. **Phase 2:** Basic UI (MVP)
   - List keys
   - Generate keys
   - Revoke keys

3. **Phase 3:** Enhanced UI (if time permits)
   - Copy to clipboard
   - Better design
   - Tooltips and help text

### v0.23.0 Release (Future)
- QR code generation
- Usage analytics
- Key rotation helper
- Advanced scopes management

---

## Dependencies

### Required
- Existing: `lib/auth/api-keys.ts` ✅
- Existing: `lib/database/api-keys.ts` ✅
- Existing: `supabase/migrations/20260217120000_create_api_keys_table.sql` ✅

### Optional (Future)
- `qrcode` - QR code generation
- `recharts` - Usage analytics charts
- `date-fns` - Date formatting and calculations

---

## Success Metrics

### Adoption
- [ ] 80% of developers generate at least one API key
- [ ] Average 2-3 keys per active user (different devices)
- [ ] <5% revocation rate per week (indicates good UX)

### Performance
- [ ] Key generation < 500ms
- [ ] List keys < 200ms
- [ ] Zero security incidents related to API keys

### User Experience
- [ ] <2 support tickets related to API key management
- [ ] Positive feedback in Linear comments
- [ ] Widget usage increases by 50%

---

## Related Resources

- Main PR: #71 (iPhone Widget with API Key Authentication)
- Documentation: `docs/IPHONE_WIDGET.md`
- Scriptable Widget: `scriptable/cron-widget.js`
- Test Page: `/test-api-key`

---

**Next Action:** Create Linear issue and assign for implementation in v0.22.0.
