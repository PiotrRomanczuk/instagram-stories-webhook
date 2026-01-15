# 📖 Technical Guides

This manual provides detailed instructions for using and extending the Instagram Story Automation system.

---

## 📅 Story Scheduling System

The scheduling system allows you to queue Instagram stories for future publication.

### How it works:
1. **Schedule**: Use the [Schedule Manager](/schedule) to enter a media URL and a future time.
2. **Process**: A background job periodically checks for due posts.
3. **Publish**: When the time is reached, the system automatically publishes the story.

### Background Processing (CRON)
To enable automatic publishing, you must set up a cron job to call the process endpoint every minute:

**Option 1: Windows Task Scheduler**
- Program: `curl.exe`
- Argument: `http://localhost:3000/api/schedule/process`
- Frequency: Every 1 minute

**Option 2: Linux/Mac Crontab**
```bash
* * * * * curl http://localhost:3000/api/schedule/process
```

**Option 3: Manual Trigger**
For development, you can trigger processing anytime:
```bash
curl http://localhost:3000/api/schedule/process
```

---

## 📡 Webhook Integration

You can trigger stories from external services (Make.com, Zapier, etc.) by POSTing to your webhook endpoint.

### Endpoint
`POST http://localhost:3000/api/publish`

### Payload
```json
{
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "IMAGE"
}
```

### Response
```json
{
  "success": true,
  "id": "18012345678901234",
  "message": "Story published successfully"
}
```

---

## 🎨 Media Requirements

Instagram has strict requirements for story media:

| Aspect | Image | Video |
|--------|-------|-------|
| **Ratio** | 9:16 (Recommended) | 9:16 (Required) |
| **Duration** | N/A | 3s - 60s |
| **Format** | JPG, PNG | MP4, MOV |
| **Max Size** | 8MB | 100MB |

---

## 🏗️ Technical Architecture

### Data Storage
- `data/tokens.json`: Stores short and long-lived Meta access tokens.
- `data/scheduled-posts.json`: Persistent storage for scheduled content and its status.

### Status Cycles
1. `pending`: Waiting for scheduled time.
2. `published`: Successfully posted to Instagram.
3. `failed`: Something went wrong (check error logs).
4. `cancelled`: Manually stopped by user.

---

## 🚀 Production Deployment

### Prerequisites
1. Set the Meta App to **"Live Mode"**.
2. Complete **App Review** for required permissions if using with public users.
3. Configure `FB_REDIRECT_URI` to your production domain in `.env`.

### Environment Variables
Ensure all variables are set in your production host (Vercel, Railway, Coolify, etc.):
- `NEXT_PUBLIC_FB_APP_ID`
- `FB_APP_SECRET`
- `FB_REDIRECT_URI`
- `VERIFY_TOKEN` (for incoming webhooks)

---

## 🛠️ API Reference

- `GET /api/auth`: Initiates the Meta OAuth flow.
- `GET /api/auth/callback`: Handles the redirect from Facebook and saves tokens.
- `GET /api/tokens`: Returns current token status (for debug).
- `GET /api/schedule`: List all scheduled posts.
- `POST /api/schedule`: Create a new scheduled post.
- `GET /api/schedule/process`: Background processor for due posts.
