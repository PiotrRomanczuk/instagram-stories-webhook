---
description: Standardize Meta Graph API usage for Instagram publishing.
---

# Meta Graph API Integration Standards

## API Versioning
- Always use the `GRAPH_API_BASE` constant from `lib/instagram/publish.ts`.
- Current version: `v24.0`. Update this constant when upgrading.
- Never hardcode API versions in individual files.

## Error Handling
- Wrap all `axios` calls to Meta API in `try/catch` blocks.
- Use `axios.isAxiosError(error)` to differentiate network errors from API errors.
- Handle specific Meta error codes:
  - `368`: Rate limit or content policy block.
  - `100`: Invalid parameter (check permissions or media URL).
  - `190`: Invalid or expired access token.

## Media Publishing Flow
1. **Create Container**: POST to `/{ig-user-id}/media` with appropriate parameters.
2. **Wait for Ready**: For VIDEO/REEL, always use `waitForContainerReady()` before publishing.
3. **Publish**: POST to `/{ig-user-id}/media_publish` with `creation_id`.

## Token Management
- Always check for token existence before making API calls.
- Cache `user_id` (Instagram Business Account ID) after first lookup to avoid redundant API calls.
- Use `getInstagramBusinessAccountId` from `lib/instagram/account.ts` for lookups.

## Security
- Never log full access tokens; use masking (e.g., `token.slice(0, 6) + '...'`).
- Store tokens server-side only (Supabase or encrypted file).
