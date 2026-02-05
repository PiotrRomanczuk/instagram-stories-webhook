# Instagram Media Details API

## Endpoint

```
GET /api/instagram/media/[mediaId]
```

## Description

Fetches detailed information about a specific Instagram media item (story) by its ID. This endpoint is used to verify that a story was successfully published to Instagram and to retrieve its metadata.

## Authentication

**Required**: Yes

- Must have a valid session with `session.user.id`
- Uses `getServerSession(authOptions)` to verify authentication
- Returns `401 Unauthorized` if not authenticated

## Route Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaId` | string | Yes | Instagram media ID (e.g., `17895695668004550`) |

## Response Format

### Success (200)

```typescript
{
  story: {
    id: string;
    media_type: 'IMAGE' | 'VIDEO';
    media_url: string;
    thumbnail_url?: string;
    permalink?: string;
    caption?: string;
    timestamp: string;
    username?: string;
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Media ID is required"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

Or if token expired:
```json
{
  "error": "Instagram authentication expired. Please reconnect your account."
}
```

#### 404 Not Found
```json
{
  "error": "Story not found or expired"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Error message"
}
```

## Example Usage

### JavaScript (Fetch API)

```javascript
// Fetch specific story details
const response = await fetch('/api/instagram/media/17895695668004550');
const data = await response.json();

if (response.ok) {
  console.log('Story:', data.story);
  console.log('Type:', data.story.media_type);
  console.log('URL:', data.story.media_url);
} else {
  console.error('Error:', data.error);
}
```

### React with SWR

```typescript
import useSWR from 'swr';

function StoryVerification({ mediaId }: { mediaId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/instagram/media/${mediaId}`,
    (url) => fetch(url).then(res => res.json())
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Failed to load story</div>;
  if (data?.error) return <div>Error: {data.error}</div>;

  return (
    <div>
      <h2>Story Details</h2>
      <img src={data.story.media_url} alt="Instagram Story" />
      <p>Type: {data.story.media_type}</p>
      <p>Posted: {new Date(data.story.timestamp).toLocaleString()}</p>
      {data.story.caption && <p>Caption: {data.story.caption}</p>}
    </div>
  );
}
```

### cURL

```bash
# Fetch story details
curl -X GET \
  'http://localhost:3000/api/instagram/media/17895695668004550' \
  -H 'Cookie: next-auth.session-token=YOUR_SESSION_TOKEN'
```

## Error Handling

The endpoint handles several types of errors:

1. **Authentication Errors**
   - No session: Returns 401
   - Expired token: Returns 401 with reconnection message
   - Invalid token: Returns 401 with reconnection message

2. **Media Errors**
   - Missing mediaId: Returns 400
   - Story not found: Returns 404
   - Story expired (>24h): Returns 404

3. **Instagram API Errors**
   - Rate limiting: Returns 500
   - Network errors: Returns 500

## Implementation Details

### Flow

1. Verify user authentication using `getServerSession()`
2. Extract `mediaId` from route parameters
3. Call `getMediaDetails(mediaId, userId)` from `lib/instagram/media.ts`
4. Handle Instagram API responses:
   - Success: Return story object
   - Not found: Return 404
   - Token issues: Return 401
   - Other errors: Return 500

### Logging

All requests are logged with the following events:

- `info`: Successful fetch with mediaId and user
- `warn`: Unauthorized attempts, missing parameters, not found
- `error`: API failures and exceptions

### Security

- Authentication required for all requests
- User-scoped access (uses user's own Instagram token)
- No cross-user access possible
- Token validation via Instagram Graph API

## Related Endpoints

- `GET /api/instagram/recent-stories` - Lists recent stories (last 24 hours)

## Testing

Unit tests available at: `__tests__/api/instagram-media.test.ts`

Coverage:
- Authentication validation
- Missing/invalid parameters
- Success cases (image and video)
- Error handling (expired token, not found, network errors)
- Edge cases (no caption, with thumbnail)

## Notes

- Stories expire after 24 hours on Instagram
- The endpoint returns `404` for expired stories
- Video stories include a `thumbnail_url` field
- The `permalink` field may not always be available
- Uses Instagram Graph API v24.0

## Dependencies

- `lib/instagram/media.ts` - `getMediaDetails()` function
- `lib/auth.ts` - NextAuth configuration
- `lib/utils/logger.ts` - Logging utility
