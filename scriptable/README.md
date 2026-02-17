# Scriptable Widgets

iOS widgets for monitoring the Instagram Stories Webhook app using the [Scriptable app](https://scriptable.app).

## Available Widgets

### Cron Status Widget (`cron-widget.js`)

Real-time monitoring of cron jobs, queue metrics, and system health on your iPhone.

**Features:**
- 🔄 Auto-refresh every 15-60 minutes (iOS controlled)
- 📊 Real-time cron job status
- 📋 Queue metrics (pending, processing, stuck posts)
- ✅ 24-hour success/failure statistics
- 🔍 Recent log entries (large widget only)
- 🎨 Beautiful gradient design with emojis

## Setup Instructions

### 1. Generate API Key

1. Visit your production app at `/developer`
2. Navigate to the **API Keys** tab
3. Click **"Generate New Key"**
4. Give it a name (e.g., "iPhone Widget")
5. Copy the API key (it will only be shown once!)
   - Format: `sk_live_...`
6. The key will have `cron:read` and `logs:read` scopes by default

### 2. Install Scriptable App

1. Install [Scriptable from the App Store](https://apps.apple.com/us/app/scriptable/id1405459188)
2. Open Scriptable

### 3. Create Widget Script

1. In Scriptable, tap the **+** icon to create a new script
2. Name it "Cron Status" or similar
3. Copy the contents of `cron-widget.js` from this repository
4. Paste into the script editor
5. **Update the configuration:**
   ```javascript
   const API_BASE_URL = "https://your-app.vercel.app"; // Your production URL
   const API_KEY = "sk_live_..."; // Your API key from step 1
   ```
6. Tap **Done** to save

### 4. Test the Widget

1. Tap the script name to run it
2. You should see a preview of the widget
3. If you see an error:
   - Check that `API_BASE_URL` is correct (no trailing slash)
   - Verify `API_KEY` is copied correctly
   - Ensure your API key has `cron:read` scope
   - Check network connection

### 5. Add to Home Screen

1. Long press on your iPhone home screen
2. Tap the **+** icon in the top left
3. Search for **Scriptable**
4. Select widget size:
   - **Small**: Status + queue count (compact)
   - **Medium**: Full status + metrics + 24h stats (recommended)
   - **Large**: All above + recent log entries
5. Tap **Add Widget**
6. Tap the widget to configure
7. Select **Script** → Choose your "Cron Status" script
8. Tap outside to close

## Widget Sizes

### Small Widget
- Cron job status (✅/❌)
- Next run countdown
- Posts in queue

### Medium Widget (Recommended)
- Cron job status with last run time
- Queue metrics (queue, processing, stuck)
- 24-hour statistics (published, failed, error rate)
- Refresh timestamp

### Large Widget
- Compact status and metrics
- Last 5 log entries with timestamps
- Color-coded by log level (error, warn, info)
- Perfect for detailed monitoring

## Troubleshooting

### Widget shows "Error loading data"
- Verify `API_BASE_URL` is correct
- Verify `API_KEY` is correct (check for copy/paste errors)
- Ensure your production API is running
- Check iPhone network connection

### Widget shows "Unauthorized"
- Your API key may have been revoked
- Generate a new API key in the developer dashboard

### Widget shows "Insufficient permissions"
- Your API key doesn't have `cron:read` scope
- Regenerate the key with correct scopes

### Widget not updating
- iOS controls widget refresh frequency (typically 15-60 minutes)
- Try removing and re-adding the widget
- Check if Scriptable has background refresh enabled in Settings

### Widget shows old data
- iOS may pause updates when battery is low
- Check Settings → Screen Time → Widget refresh settings
- Manually refresh by opening the Scriptable app and running the script

## Security Notes

- **Never share your API key** - it provides access to your cron status data
- **Store the key securely** - it's only shown once when generated
- **Revoke compromised keys** - if leaked, immediately revoke in developer dashboard
- API keys can be set to expire (recommended for production use)
- Each user can have multiple API keys (e.g., iPhone, iPad, etc.)

## API Key Management

### View Your API Keys
1. Visit `/developer` → API Keys tab
2. See all active keys with:
   - Name
   - Key prefix (e.g., `sk_live_abc123...`)
   - Scopes
   - Last used time
   - Expiration date

### Revoke an API Key
1. Click **Revoke** next to the key
2. Confirm revocation
3. Widget will stop working immediately
4. Generate a new key and update widget configuration

### Rotate API Keys
For security best practices, rotate keys periodically:
1. Generate new API key
2. Update widget configuration with new key
3. Test widget works
4. Revoke old API key

## Customization

### Change Widget Colors
Edit the gradient colors in `cron-widget.js`:
```javascript
const gradient = new LinearGradient();
gradient.colors = [new Color("#1a1a2e"), new Color("#16213e")]; // Customize here
gradient.locations = [0.0, 1.0];
```

### Change Refresh Rate
iOS controls refresh frequency, but you can request more/less frequent updates:
- Small widgets: Refreshed less frequently
- Medium/Large widgets: Refreshed more frequently
- Actual rate varies based on battery, usage patterns, etc.

### Add More Data
The API endpoint returns additional data you can display:
- `data.status.jobs` - All cron jobs (process, identity-audit, check-media-health)
- `data.metrics` - All queue metrics
- `data.recentLogs` - Last 10 log entries

## Development

### Testing Locally
Update `API_BASE_URL` to your local development server:
```javascript
const API_BASE_URL = "http://localhost:3000"; // Development
```

Note: iOS Scriptable may have issues with `localhost`. Use your computer's IP address instead:
```javascript
const API_BASE_URL = "http://192.168.1.100:3000"; // Your computer's IP
```

### API Response Format
```json
{
  "status": {
    "jobs": [
      {
        "name": "process",
        "schedule": "* * * * *",
        "lastRun": "2026-02-17T13:00:00.000Z",
        "lastRunRelative": "2m ago",
        "lastStatus": "success",
        "lastMessage": "Processed 3 posts",
        "nextExpectedRun": "2026-02-17T13:02:00.000Z",
        "nextRunCountdown": "in 30s"
      }
    ],
    "timestamp": "2026-02-17T13:01:30.000Z"
  },
  "metrics": {
    "postsInQueue": 5,
    "postsProcessing": 1,
    "postsStuck": 0,
    "failedLast24h": 2,
    "publishedLast24h": 47,
    "errorRate": 4
  },
  "recentLogs": [
    {
      "id": "log_123",
      "level": "info",
      "module": "cron",
      "message": "Cron job started",
      "details": {},
      "created_at": "2026-02-17T13:00:00.000Z"
    }
  ],
  "timestamp": "2026-02-17T13:01:30.000Z"
}
```

## Support

For issues or feature requests, please file an issue in the GitHub repository.

## License

Same as the parent project.
