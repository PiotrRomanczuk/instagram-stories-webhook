# 🩺 Troubleshooting & Support

Use this guide to diagnose and fix issues with Meta Authentication and account connections.

---

## 🔍 The Debug Dashboard

The most powerful tool at your disposal is the **[Debug Center](/debug)**.

Visit: `http://localhost:3000/debug`

**What to look for:**
- **Instagram Connection Status**: Shows if any Instagram Business Accounts are correctly linked.
- **Permissions Checklist**: All 4 permissions must show "Granted".
- **Access Token Status**: Check if the token is valid or expired.
- **Accounts Hierarchy**: Verify your Facebook Page is visible and connected to Instagram.

---

## 🚨 Common Issues & Fixes

### 1. "No Facebook Pages found"
**Cause**: The Facebook account logged in doesn't own any Pages.
**Fix**:
1. go to [Facebook Pages](https://www.facebook.com/pages/create) and create a new Page.
2. Link your Instagram Business Account to this new Page.
3. Re-authenticate in the app.

### 2. "No Instagram Account linked"
**Cause**: Your Instagram is either Personal, or not linked to a Facebook Page.
**Fix**:
1. Open Instagram App → Settings → Account Type → **Switch to Professional/Business Account**.
2. Go to your Facebook Page → Settings → **Linked Accounts** → Connect Instagram.

### 3. "Redirect URI Mismatch"
**Cause**: The URL in your Meta App settings doesn't match your local environment.
**Fix**:
1. Go to [Meta Developers Console](https://developers.facebook.com/apps/798644479898983).
2. Facebook Login → Settings → **Valid OAuth Redirect URIs**.
3. Add: `http://localhost:3000/api/auth/callback`.

### 4. "Insufficient Permissions"
**Cause**: You didn't select all checkboxes during the Facebook popup.
**Fix**: Click the **"Connect Facebook"** button again. When the popup appears, click **"Edit Settings"** and ensure ALL Pages and ALL permissions are checked.

---

## 🛠️ Debugging Tools

### Interactive Debug Script (`scripts/debug-auth.bat`)
Run this on Windows for a menu-driven diagnostic tool:
```powershell
.\scripts\debug-auth.bat
```
It allows you to:
- Clear tokens (for a fresh start)
- Validate tokens directly with the Meta API
- Check granted permissions
- List accessible Pages

### Manual Token Reset
If you get stuck in an auth loop:
1. Stop the dev server.
2. Run: `echo {} > data/tokens.json`
3. Restart the dev server and use an **Incognito Browser**.

---

## 📑 Meta Account Checklist

For the system to work, your Meta ecosystem must look like this:

1. **Personal Facebook Account** 👤
   - Admin of the Facebook Page.
   - Admin of the Developer App.
2. **Facebook Page** 📄
   - Connected to the Instagram Account.
3. **Instagram Business/Creator Account** 📸
   - *Cannot* be a Personal account.
4. **Developer App** ⚙️
   - Permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`.

---

## 🆘 Manual Authentication Link
If the button on the UI fails, you can try this direct OAuth link (replace placeholders):
`https://www.facebook.com/v18.0/dialog/oauth?client_id=798644479898983&redirect_uri=http://localhost:3000/api/auth/callback&scope=instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list&response_type=code`
