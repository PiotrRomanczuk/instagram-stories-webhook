# 📸 Instagram Story Automation & Webhook

A powerful Next.js application for programmatically publishing and scheduling Instagram Stories via the Meta Graph API.

---

## Documentation

https://developers.facebook.com/docs/instagram-platform/content-publishing/
https://developers.facebook.com/docs/permissions


## 🚀 Quick Start (5 Minutes)

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 2. Connect to Meta
1. Open an **Incognito Browser**
2. Navigate to [http://localhost:3000](http://localhost:3000)
3. Click **"Connect Facebook"**
4. Grant the 4 required permissions
5. Verify status shows **"Fully Authenticated"** ✅

### 3. Test a Story
Once authenticated, use the **"Quick Test Suite"** on the homepage to publish your first story!

---

## 🛠️ Main Features

| Feature | Description | Link |
|---------|-------------|------|
| **Instant Publishing** | Send stories immediately via Webhook or UI | `/` |
| **Story Scheduling** | Schedule posts for future dates/times | `/schedule` |
| **Meta Auth Flow** | Seamless Facebook/Instagram integration | `/api/auth` |
| **Debug Dashboard** | Real-time connection status & API insights | `/debug` |
| **Permissions Guide** | Detailed Meta API scope reference | `docs/META_PERMISSIONS.md` |

---

## 📊 System Status Dashboard

*   **App ID:** `798644479898983`
*   **Redirect URI:** `http://localhost:3000/api/auth/callback`
*   **Required Scopes:** `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`
*   **Storage:** Supabase PostgreSQL (Tokens & Scheduled Posts)

---

## 📖 Complete Documentation

Check out our unified guides for detailed information:

1.  **[GUIDES.md](./docs/GUIDES.md)** - Feature deep-dives, API references, and production setup.
2.  **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Solve common issues, Meta account setup, and debug tools.
3.  **[META_PERMISSIONS.md](./docs/META_PERMISSIONS.md)** - Detailed reference for API scopes and future features.
4.  **[CLIENT_SETUP_GUIDE.md](./docs/CLIENT_SETUP_GUIDE.md)** - Complete step-by-step guide for new client deployments.
5.  **[PI_DEPLOYMENT.md](./docs/PI_DEPLOYMENT.md)** - Raspberry Pi local deployment instructions.

### ⚙️ Application Settings

For new deployments, use the built-in Settings page to configure credentials:

1. Navigate to **Developer Tools** → **Application Settings** (`/settings`)
2. Enter all API keys and secrets via the web interface
3. Settings are stored locally in `data/app-config.json` (gitignored for security)

---

## 🆘 Need Help?

*   Run the interactive debug script: `.\debug-auth.bat`
*   Visit the live debug center: `http://localhost:3000/debug`
*   Follow the automated workflow: `/fresh-meta-auth`

---

Built with ❤️ by Antigravity
