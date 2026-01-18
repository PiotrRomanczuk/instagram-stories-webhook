# 🎯 Meta & Instagram Setup Guide

**Step-by-step instructions for connecting a client's Instagram Business account to the application.**

> 📸 **Note for Developer**: Add screenshots to each step marked with `[SCREENSHOT]` for future client handoffs.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] Access to client's Instagram account credentials
- [ ] Access to client's Facebook account (or ability to create one)
- [ ] The application already deployed and running

---

## 🏢 Part 1: Facebook Business Account Setup

### Step 1.1: Create a Facebook Account (if needed)

If the client doesn't have a Facebook account:

1. Go to [facebook.com](https://www.facebook.com)
2. Click **"Create new account"**
3. Fill in the required information
4. Verify the email address

[SCREENSHOT]

### Step 1.2: Create a Facebook Business Page

⚠️ **IMPORTANT**: A Facebook Page is **required** to connect an Instagram Business account to the API.

1. Go to [facebook.com/pages/create](https://www.facebook.com/pages/create)
2. Choose **"Business or Brand"**
3. Enter the business/brand name
4. Select an appropriate category (e.g., "Creator", "Brand", "Company")
5. Click **"Create Page"**

[SCREENSHOT]

### Step 1.3: Complete Basic Page Setup

1. Add a profile picture (business logo)
2. Add a cover photo
3. Fill in the "About" section with business description

[SCREENSHOT]

**📝 Note the Facebook Page name - you'll need it when connecting Instagram.**

---

## 📸 Part 2: Instagram Business Profile Connection

### Step 2.1: Convert Instagram to Business/Creator Account

If the client's Instagram is still a Personal account:

1. Open the **Instagram app** on phone
2. Go to **Settings** (hamburger menu → Settings and privacy)
3. Scroll to **"Account type and tools"**
4. Select **"Switch to professional account"**
5. Choose either:
   - **Creator** (for influencers, content creators)
   - **Business** (for businesses, brands)
6. Select the appropriate category
7. Complete the setup

[SCREENSHOT: Settings menu]
[SCREENSHOT: Professional account selection]

### Step 2.2: Link Instagram to Facebook Page

**⚠️ This is the CRITICAL step that enables API access!**

1. Open the **Instagram app**
2. Go to **Settings and privacy**
3. Scroll to **"Business tools and controls"** (or "Creator tools and controls")
4. Tap **"Linked accounts"** or **"Connected experiences"**
5. Select **"Facebook"**
6. Log in to Facebook if prompted
7. **Select the Facebook Page** created in Part 1 (NOT personal profile!)
8. Confirm the connection

[SCREENSHOT: Instagram linked accounts]
[SCREENSHOT: Facebook page selection]
[SCREENSHOT: Connection confirmation]

### Step 2.3: Verify the Connection

1. On Instagram, go to **Settings → Accounts Center**
2. Verify that **both** Instagram and Facebook accounts are listed
3. Ensure the **Facebook Page** is connected (not just personal profile)

[SCREENSHOT: Accounts Center showing connected accounts]

---

## 🛠️ Part 3: Meta Developer App Setup

### Step 3.1: Access Meta for Developers

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with the **same Facebook account** that owns the Page
3. Click **"My Apps"** in the top-right corner

[SCREENSHOT]

### Step 3.2: Create a New App

1. Click **"Create App"**
2. Select **"Other"** as the use case
3. Click **Next**
4. Select **"Consumer"** as the app type
5. Click **Next**

[SCREENSHOT: App type selection]

### Step 3.3: Configure App Details

1. **Display Name**: Enter a name (e.g., "Instagram Story Manager")
2. **App Contact Email**: Client's email address
3. Click **"Create App"**
4. Enter Facebook password if prompted

[SCREENSHOT: App creation form]

### Step 3.4: Add Instagram Product

1. In the left sidebar, click **"Add product"**
2. Find **"Instagram"** and click **"Set Up"**
3. This adds Instagram Basic Display and Instagram Graph API

[SCREENSHOT: Product selection with Instagram]

### Step 3.5: Configure Facebook Login

1. In the left sidebar, find **"Facebook Login"** → **"Settings"**
2. Set **"Valid OAuth Redirect URIs"** to your app URL:
   ```
   http://localhost:3000/api/auth/link-facebook/callback
   ```
   
   **For Cloudflare Tunnel / Production:**
   ```
   https://your-domain.com/api/auth/link-facebook/callback
   ```

3. Click **Save Changes**

[SCREENSHOT: OAuth redirect URI configuration]

### Step 3.6: Get App Credentials

1. In the left sidebar, click **"Settings"** → **"Basic"**
2. Copy and save:
   - **App ID**: (visible at top)
   - **App Secret**: Click "Show" and copy

[SCREENSHOT: App ID and Secret location]

**⚠️ IMPORTANT**: Keep the App Secret confidential! Never share it publicly.

### Step 3.7: Add Tester (for Development Mode)

Since the app stays in Development Mode (no App Review needed for personal use):

1. Go to **App Roles** → **Roles** in the left sidebar
   - Direct Link: `https://developers.facebook.com/apps/{your-app-id}/roles/roles/`
2. Click **"Add People"**
3. Enter the client's Facebook account name or ID
4. Select **"Tester"** role
5. Click **Add**
6. Have the client accept the invitation from Facebook notifications:
   - Client needs to go to: `https://developers.facebook.com/requests/`

[SCREENSHOT: App Roles configuration]

> 💡 **Note**: In Development Mode, only added testers/developers can use the app. This is perfect for single-client deployments.

---

## ⚙️ Part 4: Configure the Application

### Step 4.1: Enter Meta Credentials

1. Open the application in a browser
2. Navigate to **Developer Tools** → **Application Settings** (`/settings`)
3. In the **Meta / Facebook** section, enter:

| Field | Value |
|-------|-------|
| **Facebook App ID** | The App ID from Step 3.6 |
| **Facebook App Secret** | The App Secret from Step 3.6 |

4. Click **Save Configuration**

[SCREENSHOT: Settings page with Meta section]

### Step 4.2: Connect Facebook Account in App

1. Go to the main dashboard (`/`)
2. Sign in with your Google account
3. Click **"Connect Facebook"**
4. Log in with the Facebook account that:
   - Owns the Facebook Page
   - Is linked to the Instagram Business account
   - Is added as a Tester in the Meta App

5. **Grant ALL requested permissions**:
   - ✅ Instagram Basic
   - ✅ Instagram Content Publish
   - ✅ Instagram Manage Insights
   - ✅ Instagram Manage Messages
   - ✅ Instagram Manage Comments
   - ✅ Pages Read Engagement
   - ✅ Pages Show List

6. Complete the authorization

[SCREENSHOT: Facebook permission grant screen]

### Step 4.3: Verify Connection

After authorization, the dashboard should show:

- ✅ **Status**: "Fully Authenticated"
- ✅ **Instagram Account**: Detected with username

[SCREENSHOT: Successful connection status]

---

## ✅ Part 5: Test the Connection

### Quick Test

1. Go to **Developer Tools** (`/developer`)
2. In **"Quick Debug Publish"**, enter a test image URL
3. Click **Send**
4. Check Instagram Stories for the published post

**Example test image URL:**
```
https://picsum.photos/1080/1920
```

[SCREENSHOT: Successful test publish]

---

## 🔧 Troubleshooting

### "No Instagram Business Account found"

| Check | Solution |
|-------|----------|
| Instagram account type | Must be **Business** or **Creator**, not Personal |
| Facebook Page linked | Instagram must be linked to a **Facebook Page**, not just personal profile |
| Same account used | Must authorize with the Facebook account that owns the connected Page |

**Steps to fix:**
1. Open Instagram app → Settings → Business tools → Linked accounts
2. Ensure a Facebook **Page** is connected
3. Re-connect Facebook in the application

### "Permission denied" errors

| Check | Solution |
|-------|----------|
| App tester role | Ensure Facebook account is added as Tester in Meta Developer App |
| Permissions granted | Must grant ALL permissions during OAuth flow |
| Token expired | Click "Update Connection" to refresh tokens |

### "Token exchange failed"

| Check | Solution |
|-------|----------|
| App ID/Secret correct | Verify credentials in `/settings` match exactly |
| Redirect URI correct | Must match exactly: `http://localhost:3000/api/auth/link-facebook/callback` |

---

## 📋 Quick Reference

### Meta Developer Console
- **URL**: [developers.facebook.com](https://developers.facebook.com)
- **Needed**: App ID, App Secret

### Required Connections
```
Client's Facebook Account
    └── Facebook Page (Business/Brand)
            └── Instagram Business/Creator Account
```

### Required Permissions (OAuth Scopes)
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_insights`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `pages_read_engagement`
- `pages_show_list`
- `public_profile`

---

**Document Version**: 1.1 (Meta-focused)  
**Last Updated**: January 2026
