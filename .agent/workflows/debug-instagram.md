---
description: Instagram API troubleshooting workflow for publishing failures.
---

# Debug Instagram Workflow

Use this workflow when Instagram publishing fails or returns unexpected errors.

## 1. Check Token Validity
1. Read current tokens from database or `data/tokens.json`.
2. Check `expires_at` timestamp - is the token expired?
3. If expired, guide user to re-authenticate or extend token.

## 2. Validate Token with Meta API
```bash
curl "https://graph.facebook.com/v24.0/me?fields=id,name&access_token=YOUR_TOKEN"
```
- **Success**: Returns user `id` and `name`.
- **Failure**: `Invalid OAuth access token` - token is invalid, re-authenticate.

## 3. Check Permissions
```bash
curl "https://graph.facebook.com/v24.0/me/permissions?access_token=YOUR_TOKEN"
```
Required permissions (all must be `granted`):
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`
- `pages_show_list`

## 4. Verify Page Access
```bash
curl "https://graph.facebook.com/v24.0/me/accounts?access_token=YOUR_TOKEN"
```
- Must return at least one page.
- Page must have `CREATE_CONTENT` in `tasks` array.

## 5. Verify Instagram Account Linkage
```bash
curl "https://graph.facebook.com/v24.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
```
- Must return `instagram_business_account.id`.
- If missing, Instagram is not linked to the Facebook Page.

## 6. Check Rate Limits
```bash
curl "https://graph.facebook.com/v24.0/IG_USER_ID/content_publishing_limit?access_token=YOUR_TOKEN"
```
- Check `quota_usage` against `config.quota_total`.

## 7. Common Error Codes
| Code | Meaning | Solution |
|------|---------|----------|
| 190 | Invalid token | Re-authenticate |
| 368 | Rate limit/Policy block | Wait 24 hours, check content |
| 100 | Invalid parameter | Check media URL accessibility |
| 10 | Permission denied | Re-authenticate with all scopes |

## 8. Provide Resolution
Based on findings, guide user to:
- Re-authenticate via `/fresh-meta-auth` workflow.
- Link Instagram to Facebook Page (manual steps).
- Wait for rate limit reset.
- Fix media URL accessibility.
