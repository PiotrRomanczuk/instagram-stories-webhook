# iPhone Widget for Cron Monitoring

Monitor your Instagram Stories Webhook cron jobs, queue metrics, and system health directly from your iPhone home screen using the [Scriptable app](https://scriptable.app).

---

## Overview

The iPhone Widget provides real-time visibility into:
- 📊 **Cron job status** - Last run, next run, success/failure
- 📋 **Queue metrics** - Posts in queue, processing, stuck
- ✅ **24-hour statistics** - Published and failed posts
- 🔍 **Recent logs** - System events and errors (large widget only)

**No app required!** Uses the free Scriptable app with a beautiful custom widget.

---

## Quick Start

### Step 1: Generate API Key

1. Visit your production app's developer dashboard at `/developer`
2. Navigate to the **API Keys** tab *(coming in v0.21.0)*
3. Click **"Generate New Key"**
4. Give it a descriptive name (e.g., "iPhone Widget")
5. **Copy the API key immediately** (it will only be shown once!)
   - Format: `sk_live_...`
6. The key will have `cron:read` and `logs:read` scopes by default

**Note:** Until the UI is available, API keys can be generated via the API or database directly.

### Step 2: Install Scriptable

1. Download [Scriptable from the App Store](https://apps.apple.com/us/app/scriptable/id1405459188) (free)
2. Open the Scriptable app

### Step 3: Create Widget Script

1. In Scriptable, tap the **+** icon (top right) to create a new script
2. Give it a name (e.g., "Cron Status")
3. Copy the contents of [`scriptable/cron-widget.js`](../scriptable/cron-widget.js) from this repository
4. Paste into the script editor
5. **Update the configuration** at the top of the file:
   ```javascript
   const API_BASE_URL = "https://your-app.vercel.app"; // Your production URL
   const API_KEY = "sk_live_..."; // Your API key from Step 1
   ```
6. Tap **Done** to save

### Step 4: Test the Widget

1. Tap the script name to run it
2. You should see a preview of the widget with live data
3. If you see an error:
   - ❌ "Error loading data" → Check `API_BASE_URL` and `API_KEY` are correct
   - ❌ "Unauthorized" → API key is invalid or revoked
   - ❌ "Insufficient permissions" → API key missing `cron:read` scope

### Step 5: Add to Home Screen

1. Long press on your iPhone home screen (enter jiggle mode)
2. Tap the **+** icon in the top left corner
3. Search for **"Scriptable"**
4. Select your preferred widget size:
   - **Small** - Status + queue count (compact)
   - **Medium** - Full status + metrics + 24h stats ⭐ **Recommended**
   - **Large** - All above + recent log entries
5. Tap **"Add Widget"**
6. Tap the widget to configure it
7. Under **Script**, select your "Cron Status" script
8. Tap outside the widget to finish

Done! Your widget will now display live cron status on your home screen. 🎉

---

## Widget Sizes

### Small Widget (1x1)
- Cron job status (✅/❌)
- Next run countdown
- Total posts in queue
- **Best for:** Quick status check

### Medium Widget (2x1) ⭐ Recommended
- Full cron job status (last run + next run)
- Queue metrics (queue, processing, stuck)
- 24-hour statistics (published, failed, error rate)
- Refresh timestamp
- **Best for:** Comprehensive monitoring

### Large Widget (2x2)
- Everything from Medium widget
- Last 5 log entries with timestamps
- Color-coded by severity (error, warn, info)
- **Best for:** Detailed debugging

---

## Features

### Auto-Refresh
- iOS automatically refreshes widgets every 15-60 minutes
- Refresh frequency depends on battery level, usage patterns, and widget size
- Cannot be manually controlled (iOS limitation)

### Beautiful Design
- Gradient background (customizable)
- Emoji status indicators
- Color-coded metrics (green for success, red for errors, orange for warnings)
- Compact, glanceable layout

### Secure Authentication
- Uses bearer token authentication
- API keys are scoped (only `cron:read` access)
- Keys can be revoked anytime from dashboard
- Supports expiration dates for extra security

---

## API Key Management

### View Your API Keys
1. Visit `/developer` → API Keys tab
2. See all active keys with:
   - Name
   - Key prefix (first 16 chars, e.g., `sk_live_abc123de...`)
   - Scopes
   - Last used time
   - Expiration date

### Revoke an API Key
1. Click **"Revoke"** next to the key in the dashboard
2. Confirm revocation
3. Widget will immediately stop working
4. Generate a new key and update widget configuration

### Rotate API Keys (Best Practice)
For security, rotate keys every 3-6 months:
1. Generate new API key
2. Update widget configuration with new key
3. Test that widget works
4. Revoke old API key

### Multiple Devices
Each device should have its own API key:
- Generate separate keys for iPhone, iPad, etc.
- Gives you visibility into which devices are active
- Allows you to revoke individual keys without affecting others

---

## Troubleshooting

### Widget shows "Error loading data"
**Cause:** Network error, invalid configuration, or API down

**Solutions:**
1. Check that `API_BASE_URL` is correct (no trailing slash)
2. Verify `API_KEY` is copied correctly (check for extra spaces)
3. Ensure your production API is running
4. Check iPhone network connection (WiFi or cellular)
5. Try running the script manually in Scriptable to see detailed error

### Widget shows "Unauthorized"
**Cause:** API key is invalid or revoked

**Solutions:**
1. Generate a new API key in the developer dashboard
2. Update `API_KEY` in the widget script
3. If you just generated the key, wait 30 seconds for database to sync

### Widget shows "Insufficient permissions"
**Cause:** API key doesn't have required scopes

**Solutions:**
1. Check that API key has `cron:read` scope in dashboard
2. Regenerate the key with correct scopes
3. Default scopes should include `cron:read` and `logs:read`

### Widget not updating
**Cause:** iOS controls widget refresh frequency

**Solutions:**
1. iOS refreshes widgets every 15-60 minutes automatically
2. Try removing and re-adding the widget
3. Check that Scriptable has background refresh enabled:
   - Settings → General → Background App Refresh → Scriptable (ON)
4. Charge your iPhone (low battery reduces widget refresh)
5. Use the widget more frequently (iOS learns your patterns)

### Widget shows old/stale data
**Cause:** iOS may pause updates when battery is low or app not used

**Solutions:**
1. Open Scriptable and run the script manually to force refresh
2. Check "Updated:" timestamp at bottom of widget
3. Remove and re-add the widget
4. Ensure Background App Refresh is enabled for Scriptable

### Data looks incorrect
**Cause:** Environment mismatch or caching

**Solutions:**
1. Verify `API_BASE_URL` points to production (not localhost)
2. Check that you're looking at the right environment (prod vs dev)
3. Open the cron debug page (`/developer/cron-debug`) to compare data
4. Check API logs for errors

---

## Customization

### Change Widget Colors
Edit the gradient in `cron-widget.js`:
```javascript
const gradient = new LinearGradient();
gradient.colors = [
  new Color("#1a1a2e"), // Dark blue
  new Color("#16213e")  // Darker blue
];
gradient.locations = [0.0, 1.0];
```

Try these color combinations:
- **Purple Gradient:** `["#5a189a", "#240046"]`
- **Green Gradient:** `["#1a472a", "#081c15"]`
- **Orange Gradient:** `["#c1121f", "#590d22"]`

### Add More Metrics
The API endpoint returns additional data you can display:
- `data.status.jobs` - All cron jobs (process, identity-audit, check-media-health)
- `data.metrics` - Complete queue health metrics
- `data.recentLogs` - Last 10 system logs

Edit `createMediumWidget()` or `createLargeWidget()` to add more fields.

### Adjust Widget Layout
Modify the widget creation functions in `cron-widget.js`:
- Change font sizes: `Font.systemFont(12)` → `Font.systemFont(14)`
- Adjust spacing: `widget.addSpacer(8)` → `widget.addSpacer(12)`
- Reorder metrics, change emojis, etc.

---

## Security Best Practices

### API Key Security
- ✅ **Never commit API keys to Git** - Keys are secrets
- ✅ **Generate unique keys per device** - iPhone, iPad, etc.
- ✅ **Set expiration dates** - Rotate keys every 3-6 months
- ✅ **Revoke unused keys** - Clean up old keys regularly
- ✅ **Monitor "last used" timestamps** - Detect suspicious activity

### Scope Principle
- API keys only have `cron:read` and `logs:read` scopes
- Cannot modify data, trigger actions, or access sensitive info
- Minimal permissions = minimal risk if key is compromised

### If Your Key Is Compromised
1. **Immediately revoke the key** in the developer dashboard
2. Check "last used" timestamp to see when it was accessed
3. Review system logs for suspicious activity
4. Generate a new key with a new name
5. Update widget configuration
6. Consider setting an expiration date on the new key

---

## API Documentation

### Endpoint
```
GET /api/mobile/cron-status
```

### Authentication
```
Authorization: Bearer sk_live_YOUR_API_KEY_HERE
```

### Response Format
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
        "lastMessage": "Processed 3 posts successfully",
        "nextExpectedRun": "2026-02-17T13:02:00.000Z",
        "nextRunCountdown": "in 30s"
      },
      {
        "name": "identity-audit",
        "schedule": "*/5 * * * *",
        "lastRun": "2026-02-17T12:55:00.000Z",
        "lastRunRelative": "7m ago",
        "lastStatus": "success",
        "lastMessage": "Identity audit completed",
        "nextExpectedRun": "2026-02-17T13:00:00.000Z",
        "nextRunCountdown": "in 2m"
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
      "message": "Cron job process started",
      "details": {},
      "created_at": "2026-02-17T13:00:00.000Z"
    }
  ],
  "timestamp": "2026-02-17T13:01:30.000Z"
}
```

### Error Responses

**401 Unauthorized** - Missing or invalid API key
```json
{
  "error": "Invalid API key"
}
```

**403 Forbidden** - API key lacks required scopes
```json
{
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error** - Server error
```json
{
  "error": "Failed to fetch cron status"
}
```

---

## Development

### Testing Locally
1. Start your development server: `npm run dev`
2. Update widget configuration:
   ```javascript
   const API_BASE_URL = "http://YOUR_IP:3000"; // Use your computer's IP, not localhost
   ```
3. Generate a dev API key (or use existing one)
4. Run the script in Scriptable

**Note:** Scriptable cannot access `localhost` - use your computer's local IP address (e.g., `192.168.1.100:3000`).

### Testing Without Scriptable
You can test the API endpoint with `curl`:
```bash
curl -H "Authorization: Bearer sk_live_..." \
     https://your-app.vercel.app/api/mobile/cron-status | jq
```

This should return the JSON response with status, metrics, and logs.

---

## Roadmap

### v0.21.0 (Current)
- ✅ API key generation and validation
- ✅ Mobile API endpoint (`/api/mobile/cron-status`)
- ✅ Scriptable widget code
- ✅ Database migration for `api_keys` table
- 🚧 API key management UI (basic API routes)

### v0.22.0 (Planned)
- 🔜 Full API key management UI in developer dashboard
- 🔜 API key usage analytics
- 🔜 Widget configuration in dashboard (generate QR code for easy setup)
- 🔜 Support for custom widget refresh intervals
- 🔜 Additional widget sizes and layouts

### Future Enhancements
- 📱 Android widget (via KWGT or Tasker)
- 🖥️ macOS widget (via Scriptable for Mac)
- 📊 Advanced metrics (charts, trends, predictions)
- 🔔 Push notifications for critical events
- 🎨 Widget themes and customization presets

---

## Support

### Need Help?
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the [scriptable/README.md](../scriptable/README.md) for additional details
3. File an issue on GitHub with:
   - Widget size
   - Error message (screenshot)
   - Steps to reproduce
   - iOS version and Scriptable version

### Feature Requests
File an issue on GitHub with the `enhancement` label.

---

## Credits

- Built with [Scriptable](https://scriptable.app) by Simon B. Støvring
- Uses the Instagram Stories Webhook API
- Icons and emojis from Unicode standard

---

## License

Same as the parent project.
