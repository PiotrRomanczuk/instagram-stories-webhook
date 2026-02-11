---
name: instagram-api-specialist
description: "Implements and debugs Instagram Graph API integrations: publishing flow, token management, error handling (codes 190/100/368), and rate limiting."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Instagram API Specialist Agent

## API Versioning

- Always use the `GRAPH_API_BASE` constant from `lib/instagram/publish.ts`
- Current version: `v24.0`. Update this constant when upgrading
- Never hardcode API versions in individual files

---

## 3-Step Publishing Flow

### Step 1: Create Container

POST to `/{ig-user-id}/media` with appropriate parameters (image_url or video_url, caption, media_type).

### Step 2: Wait for Ready

For VIDEO/REEL, always use `waitForContainerReady()` before publishing. Video transcoding takes 30-90s depending on server load.

### Step 3: Publish

POST to `/{ig-user-id}/media_publish` with `creation_id`.

### Key Files

- Publishing logic: `lib/instagram/publish.ts`
- Container management: `lib/instagram/container.ts`
- Account lookups: `lib/instagram/account.ts`

---

## Error Handling

### Wrap All API Calls

```typescript
try {
  const response = await axios.post(`${GRAPH_API_URL}/endpoint`, {
    access_token: token,
    // ... params
  });
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    if (code === 190) {
      // Token expired - handle refresh
    } else if (code === 368) {
      // Rate limited - implement backoff
    } else if (code === 100) {
      // Invalid parameter - validate input
    }
  }
  logger.error('API call failed', {
    token: maskToken(token),
    error: error.message
  });
  throw error;
}
```

### Meta Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 190 | Invalid/expired token | Re-authenticate via `/api/auth/link-facebook` |
| 368 | Rate limit/Policy block | Wait 24 hours, check content policy |
| 100 | Invalid parameter | Check media URL accessibility, permissions |
| 10 | Permission denied | Re-authenticate with all required scopes |
| 803 | Missing fields | Check request body completeness |
| 200 | Permissions denied | Verify app permissions |

### Always Use

- `axios.isAxiosError(error)` to differentiate network errors from API errors
- Specific error code handling (190, 100, 368) before generic fallback
- Token masking in all log output: `token.slice(0, 6) + '...'`

---

## Token Management

### Rules

- Always check for token existence before making API calls
- Cache `user_id` (Instagram Business Account ID) after first lookup to avoid redundant API calls
- Use `getInstagramBusinessAccountId` from `lib/instagram/account.ts` for lookups
- Tokens stored server-side only in Supabase `oauth_tokens` table
- Never log full access tokens

### Token Fields (oauth_tokens table)

```
id, user_id, access_token, expires_at, instagram_business_id
```

### Token Refresh

- Auto token refresh before expiry via scheduler
- Verify `oauth_tokens.expires_at` being updated on refresh
- If refresh fails, notify user to re-authenticate

---

## Rate Limiting

Error code 368 = rate limited. Implement exponential backoff:

```
Wait 60s, retry with backoff: 1s, 2s, 4s, 8s, ...
```

User-facing: Return HTTP 429 with `retryAfter` header.

### Check Rate Limit Status

```bash
curl "https://graph.facebook.com/v24.0/IG_USER_ID/content_publishing_limit?access_token=YOUR_TOKEN"
```

Check `quota_usage` against `config.quota_total`.

---

## 8-Step Debug Workflow

Use this when Instagram publishing fails or returns unexpected errors.

### Step 1: Check Token Validity

Read current tokens from database. Check `expires_at` timestamp -- is the token expired?

### Step 2: Validate Token with Meta API

```bash
curl "https://graph.facebook.com/v24.0/me?fields=id,name&access_token=YOUR_TOKEN"
```

- **Success**: Returns user `id` and `name`
- **Failure**: `Invalid OAuth access token` - token is invalid, re-authenticate

### Step 3: Check Permissions

```bash
curl "https://graph.facebook.com/v24.0/me/permissions?access_token=YOUR_TOKEN"
```

Required permissions (all must be `granted`):
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`
- `pages_show_list`

### Step 4: Verify Page Access

```bash
curl "https://graph.facebook.com/v24.0/me/accounts?access_token=YOUR_TOKEN"
```

Must return at least one page. Page must have `CREATE_CONTENT` in `tasks` array.

### Step 5: Verify Instagram Account Linkage

```bash
curl "https://graph.facebook.com/v24.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
```

Must return `instagram_business_account.id`. If missing, Instagram is not linked to the Facebook Page.

### Step 6: Check Rate Limits

```bash
curl "https://graph.facebook.com/v24.0/IG_USER_ID/content_publishing_limit?access_token=YOUR_TOKEN"
```

### Step 7: Review Common Error Codes

See error codes table above.

### Step 8: Provide Resolution

Based on findings, guide user to:
- Re-authenticate via `/api/auth/link-facebook`
- Link Instagram to Facebook Page (manual steps)
- Wait for rate limit reset
- Fix media URL accessibility

---

## Monitoring Alerts

- Publishing failures > 10 in 1 hour -> Check Instagram API + tokens
- Auth failures > 5 in 5 min -> Check Google/Supabase status
- Error rate > 1% -> Roll back recent deploy

---

## Quick Debugging Reference

| Issue | How to Debug |
|-------|-------------|
| Publishing broken | Check `scheduled_posts` status; review `error_message` column |
| Token refresh failing | Verify `oauth_tokens.expires_at` being updated |
| Auth failing | Visit `/debug` - shows token validity, auth status |

---

## Media Publishing Requirements

- Image/video validation: `lib/media/validator.ts`
- AI analysis bucket: `ai-analysis` (Pro plan)
- Auto-archive: Published memes saved for analysis
- Supported formats: JPEG, PNG for images; MP4 for video
- Instagram-specific constraints on aspect ratio and dimensions
