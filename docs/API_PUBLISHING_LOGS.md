# Publishing Logs API

The Publishing Logs API provides authenticated access to Instagram publishing history with proper role-based authorization.

## Endpoint

```
GET /api/publishing-logs
```

## Authentication

Requires a valid NextAuth session. Unauthenticated requests return `401 Unauthorized`.

## Authorization

- **Regular users**: Can only view their own publishing logs
- **Admins/Developers**: Can view all logs or filter by specific user

## Query Parameters

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `limit` | number | No | 10 | 100 | Number of logs to return |
| `offset` | number | No | 0 | - | Number of logs to skip (pagination) |
| `status` | string | No | - | - | Filter by status: `SUCCESS` or `FAILED` |
| `userId` | string | No | - | - | **Admin-only**: Filter by specific user ID |

## Response Format

```typescript
{
  items: PublishingLog[],
  pagination: {
    total: number,
    offset: number,
    limit: number,
    hasMore: boolean
  }
}
```

### PublishingLog Type

```typescript
interface PublishingLog {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  postType: 'STORY' | 'FEED' | 'REEL';
  caption?: string;
  status: 'SUCCESS' | 'FAILED';
  igMediaId?: string;         // Instagram Media ID (if successful)
  errorMessage?: string;      // Error details (if failed)
  createdAt: string;          // ISO 8601 timestamp
}
```

## Examples

### Get Your Own Logs (Regular User)

```bash
curl -H "Authorization: Bearer <token>" \
  "https://your-app.com/api/publishing-logs?limit=20&offset=0"
```

### Filter by Success Status

```bash
curl -H "Authorization: Bearer <token>" \
  "https://your-app.com/api/publishing-logs?status=SUCCESS"
```

### Get Failed Publishes Only

```bash
curl -H "Authorization: Bearer <token>" \
  "https://your-app.com/api/publishing-logs?status=FAILED&limit=50"
```

### Admin: View All Logs

```bash
curl -H "Authorization: Bearer <admin-token>" \
  "https://your-app.com/api/publishing-logs?limit=100&offset=0"
```

### Admin: View Specific User's Logs

```bash
curl -H "Authorization: Bearer <admin-token>" \
  "https://your-app.com/api/publishing-logs?userId=user-123"
```

## Response Examples

### Success Response

```json
{
  "items": [
    {
      "id": "log-uuid-1",
      "userId": "user-123",
      "mediaUrl": "https://example.com/image.jpg",
      "mediaType": "IMAGE",
      "postType": "STORY",
      "caption": "Check out this meme!",
      "status": "SUCCESS",
      "igMediaId": "ig-media-123",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "log-uuid-2",
      "userId": "user-123",
      "mediaUrl": "https://example.com/video.mp4",
      "mediaType": "VIDEO",
      "postType": "REEL",
      "status": "FAILED",
      "errorMessage": "Action blocked by Instagram (Rate Limit/Content Policy)",
      "createdAt": "2024-01-15T09:15:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "offset": 0,
    "limit": 10,
    "hasMore": true
  }
}
```

## Error Responses

### 401 Unauthorized

User is not authenticated.

```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden

Non-admin user trying to use admin-only features.

```json
{
  "error": "Only admins can filter by userId"
}
```

### 400 Bad Request

Invalid query parameters.

```json
{
  "error": "Invalid status. Must be \"SUCCESS\" or \"FAILED\""
}
```

### 500 Internal Server Error

Server error or database failure.

```json
{
  "error": "Failed to fetch publishing logs"
}
```

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Window**: 60 seconds rolling window
- Rate limit exceeded returns `429 Too Many Requests`

## Ordering

Logs are always returned in descending order by `created_at` (most recent first).

## Implementation Notes

- Uses `supabaseAdmin` for database queries (bypasses RLS)
- Role-based authorization at application layer
- Response follows project convention: uses `items` property (not `data`)
- Pagination uses offset-based approach for simplicity
- Optional fields (`caption`, `igMediaId`, `errorMessage`) are `undefined` when null in database

## Related Tables

This endpoint queries the `publishing_logs` table, which is populated by:

- `lib/instagram/publish.ts` - Logs every publish attempt (success or failure)
- Automatic logging on both successful publishes and error cases

## Security Considerations

- All requests require valid session
- Users can only see their own logs (RLS enforced at app layer)
- Admin privilege checked via `getUserRole()` from `lib/auth-helpers`
- No sensitive tokens or credentials exposed in response
- Rate limiting prevents abuse
