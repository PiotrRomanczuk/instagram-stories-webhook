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

## MANDATORY: Always Verify Against Official Documentation

Before implementing or debugging ANY Instagram/Meta API integration, **always check the official documentation**:

- **Meta Developer Docs**: https://developers.facebook.com/docs/
- **Instagram Graph API**: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api
- **Instagram Content Publishing**: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
- **Instagram Stories**: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/story-publishing
- **Instagram Insights**: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/insights
- **Rate Limits**: https://developers.facebook.com/docs/graph-api/overview/rate-limiting
- **Error Codes**: https://developers.facebook.com/docs/graph-api/guides/error-handling
- **Permissions Reference**: https://developers.facebook.com/docs/permissions

### Why This Is Mandatory

1. **API changes frequently** - Meta deprecates endpoints and changes behavior between versions
2. **Not everything is possible** - Some features that seem logical are not supported by the API
3. **Version-specific behavior** - Features available in v24.0 may not exist in v21.0
4. **Scope limitations** - Some actions require specific permissions or business verification

### What Is NOT Possible (Common Misconceptions)

| Feature | Status | Notes |
|---------|--------|-------|
| Scheduling via API | Not natively | Must build own scheduler (we use Vercel cron) |
| Editing published stories | Not possible | Stories cannot be modified after posting |
| Reading DM content via Graph API | Limited | Only for business messaging with permission |
| Carousel stories via API | Not supported | Only single image/video per story |
| Custom stickers/effects | Not supported | API only supports basic media |
| Deleting stories via API | Supported | `DELETE /{ig-media-id}` |
| Story polls/questions via API | Not supported | Interactive elements are app-only |

### Before Implementing a New Feature

1. Search the docs at https://developers.facebook.com/docs/ for the endpoint
2. Check if the feature is supported for the current API version
3. Check required permissions
4. Check rate limits for the endpoint
5. Test in Graph API Explorer before writing code

Use the `WebFetch` tool to check documentation when uncertain:
```
WebFetch: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
Prompt: "What endpoints and parameters are available for content publishing?"
```

---

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

---

## Error Recovery Playbooks

### Code 190: Invalid/Expired Token

**Symptoms**: All API calls fail with "Invalid OAuth access token"
**Root Cause**: Token expired, user revoked access, or app re-auth needed

**Recovery**:
1. Check token `expires_at` in `oauth_tokens` table
2. If expired recently: trigger manual refresh via `/api/schedule/refresh-token`
3. If refresh fails: user must re-authenticate via `/api/auth/link-facebook`
4. After re-auth: verify with `GET /me?fields=id,name` using new token
5. Update Vercel env if token is stored there

### Code 100: Invalid Parameter

**Symptoms**: Container creation fails, "unsupported post method"
**Root Cause**: Invalid media URL, wrong format, or missing permissions

**Recovery**:
1. Verify media URL is publicly accessible: `curl -I <media_url>`
2. Check media format (JPEG/PNG for images, MP4 for video)
3. Verify Instagram Business Account is linked to Facebook Page
4. Check that `media_type` parameter matches actual content
5. For video: ensure container is in `FINISHED` state before publishing

### Code 368: Rate Limit / Policy Block

**Symptoms**: Publishing works then suddenly fails, "temporarily blocked"
**Root Cause**: Exceeded publishing quota (25/24hr) or content policy violation

**Recovery**:
1. Check current quota: `GET /{ig-user-id}/content_publishing_limit`
2. If quota exhausted: wait for reset (rolling 24-hour window)
3. If content policy: review the specific content that triggered the block
4. Check `api_quota_history` table for usage patterns
5. Implement publishing delay to spread posts over time

### Code 10: Permission Denied

**Symptoms**: Specific endpoint returns permission error
**Root Cause**: App missing required permissions

**Recovery**:
1. Check current permissions: `GET /me/permissions`
2. Required: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`
3. If missing: re-authenticate with full scope via `/api/auth/link-facebook`

### "Container Not Ready" / Status EXPIRED

**Symptoms**: `media_publish` fails, container shows `IN_PROGRESS` or `EXPIRED`
**Root Cause**: Video transcoding timeout or Instagram server issues

**Recovery**:
1. Check container status: `GET /{container-id}?fields=status_code`
2. Status `IN_PROGRESS`: wait and poll (30-90s typical for video)
3. Status `EXPIRED`: container timed out - create a new one
4. Status `ERROR`: check `status` field for specific error
5. If persistent: try with a smaller/shorter video file
6. Refer to `media-pipeline-specialist` agent for video processing issues

---

## Quota Management Best Practices

### Monitoring

- Check `api_quota_history` table for usage trends
- Default quota: 25 publishes per rolling 24-hour window
- Quota gate (`lib/scheduler/quota-gate.ts`) checks before each publish

### Distributing Load

- Configure `publishDelayMs` in cron config to space out publishes
- Set `maxPostsPerCronRun` to limit batch size
- Safety margin in quota gate reserves headroom for manual publishes

### Fail-Open Strategy

The quota gate fails open with cap=1 if the quota API is unreachable:
- Allows 1 publish (not all) to prevent complete stall
- Logs a warning for monitoring
- Prevents runaway publishing if API is down
