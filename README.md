# 📸 Instagram Story Automation & Webhook

A powerful Next.js application for programmatically publishing and scheduling Instagram Stories via the Meta Graph API.

---

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

---

## 🆘 Need Help?

*   Run the interactive debug script: `.\debug-auth.bat`
*   Visit the live debug center: `http://localhost:3000/debug`
*   Follow the automated workflow: `/fresh-meta-auth`

---

Built with ❤️ by Antigravity
