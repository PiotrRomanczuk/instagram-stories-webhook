---
description: Complete Meta Authentication Flow for Fresh User (Incognito Mode)
---

# Fresh Meta Authentication Workflow with Debugging

This workflow will guide you through the complete Meta authentication process as a fresh user in incognito mode, with debugging at every stage to ensure everything is properly connected.

## Prerequisites Checklist

Before starting, verify you have:
- [ ] Facebook Developer App created
- [ ] Instagram Business Account connected to a Facebook Page
- [ ] App ID and App Secret from Facebook Developer Console
- [ ] Valid OAuth Redirect URI configured in Facebook App Settings
- [ ] Dev server running on `http://localhost:3000`

---

## Stage 1: Environment Setup & Verification

### Step 1.1: Clear All Previous Authentication Data

**Purpose**: Start completely fresh to avoid any cached/stale tokens

```bash
# Clear the tokens file
echo {} > data/tokens.json
```

**Debug Check**: 
- Open `data/tokens.json` - should contain only `{}`
- This ensures no old tokens interfere with the new flow

### Step 1.2: Verify Environment Variables

**Purpose**: Ensure all required credentials are properly configured

```bash
# Display current environment variables (without exposing secrets)
cat .env.local
```

**Debug Check**: Verify you have:
- `NEXT_PUBLIC_FB_APP_ID` - Your Facebook App ID
- `FB_APP_SECRET` - Your Facebook App Secret  
- `FB_REDIRECT_URI` - Should be `http://localhost:3000/api/auth/callback`
- `META_TOKEN_GEN` - (Optional) Manual token for testing

**Expected Output**:
```
NEXT_PUBLIC_FB_APP_ID=798644479898983
FB_APP_SECRET=7460dfc110050dcf2a6f9aebce4dae46
FB_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### Step 1.3: Verify Facebook App Configuration

**Purpose**: Ensure Facebook Developer App is properly configured

**Manual Steps**:
1. Go to https://developers.facebook.com/apps/
2. Select your app (ID: 798644479898983)
3. Navigate to **Settings > Basic**
   - Verify App ID matches your `.env.local`
   - Verify App Secret matches your `.env.local`
4. Navigate to **Facebook Login > Settings**
   - Verify "Valid OAuth Redirect URIs" contains: `http://localhost:3000/api/auth/callback`
   - Verify "Client OAuth Login" is **ENABLED**
   - Verify "Web OAuth Login" is **ENABLED**
5. Navigate to **App Review > Permissions and Features**
   - Verify these permissions are available:
     - `instagram_basic` (should be approved)
     - `instagram_content_publish` (should be approved)
     - `pages_read_engagement` (should be approved)
     - `pages_show_list` (should be approved)

**Debug Check**:
- ✅ All redirect URIs match exactly (including protocol http/https)
- ✅ All required permissions are approved
- ✅ App is not in Development Mode restrictions that would block your account

---

## Stage 2: Server & Application Verification

### Step 2.1: Verify Dev Server is Running

**Purpose**: Ensure the Next.js application is accessible

```bash
# Check if dev server is running
curl http://localhost:3000
```

**Debug Check**:
- Server responds with HTML (not an error)
- Terminal shows no errors
- If not running, start with: `npm run dev`

### Step 2.2: Test Authentication Endpoint

**Purpose**: Verify the OAuth initiation endpoint is working

```bash
# Test the auth route (should redirect to Facebook)
curl -I http://localhost:3000/api/auth
```

**Expected Output**:
```
HTTP/1.1 307 Temporary Redirect
Location: https://www.facebook.com/v18.0/dialog/oauth?client_id=798644479898983&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback&scope=instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list
```

**Debug Check**:
- ✅ Status is `307` (redirect)
- ✅ Location header contains `facebook.com/v18.0/dialog/oauth`
- ✅ `client_id` parameter matches your App ID
- ✅ `redirect_uri` is properly URL-encoded
- ✅ `scope` contains all 4 required permissions

### Step 2.3: Verify Callback Endpoint Exists

**Purpose**: Ensure the callback route is ready to handle Facebook's response

```bash
# Test callback endpoint (should return error without code)
curl http://localhost:3000/api/auth/callback
```

**Expected Output**:
```json
{"error":"No code provided"}
```

**Debug Check**:
- ✅ Returns JSON error (not 404)
- ✅ Error message is "No code provided" (endpoint is working)

---

## Stage 3: Fresh Browser Authentication Flow

### Step 3.1: Open Incognito Window

**Purpose**: Start with a completely clean browser state

**Manual Steps**:
1. Open a new **Incognito/Private** window in your browser
2. This ensures:
   - No cached Facebook sessions
   - No stored cookies
   - No previous authentication state

**Debug Check**:
- ✅ Incognito icon visible in browser
- ✅ No Facebook cookies present

### Step 3.2: Navigate to Application Homepage

**Purpose**: View the initial unauthenticated state

**Manual Steps**:
1. Navigate to: `http://localhost:3000`
2. Observe the page

**Expected UI State**:
- Status shows: "Disconnected"
- Button shows: "Connect Facebook"
- No webhook endpoint visible (only shows when authenticated)

**Debug Check**:
- ✅ Page loads without errors
- ✅ "Disconnected" status is displayed
- ✅ "Connect Facebook" button is visible

### Step 3.3: Initiate OAuth Flow

**Purpose**: Start the Facebook authentication process

**Manual Steps**:
1. Click the **"Connect Facebook"** button
2. Browser should redirect to Facebook

**Expected Behavior**:
- Redirects to `https://www.facebook.com/v18.0/dialog/oauth?...`
- Facebook login page appears (if not logged in)
- OR Facebook permission dialog appears (if already logged in)

**Debug Check**:
- ✅ URL contains your App ID
- ✅ URL contains correct redirect_uri
- ✅ No immediate errors or "App Not Setup" messages

### Step 3.4: Facebook Login (if needed)

**Purpose**: Authenticate with Facebook

**Manual Steps**:
1. If you see Facebook login page:
   - Enter your Facebook credentials
   - Click "Log In"
2. If already logged in, skip to next step

**Debug Check**:
- ✅ Successfully logged into Facebook
- ✅ Using the Facebook account that owns the Instagram Business Account

### Step 3.5: Review Permissions Dialog

**Purpose**: Understand what permissions the app is requesting

**Expected Dialog**:
- App name displayed
- Permissions listed:
  - Access your public profile
  - Access Instagram accounts you manage
  - Manage your Pages
  - Publish content to Instagram

**Debug Check**:
- ✅ All 4 permissions are listed
- ✅ No error messages about missing permissions
- ✅ Your Facebook Pages are listed (if applicable)

**CRITICAL**: If you see "No Pages Found" or similar:
- Your Facebook account may not have any Pages
- Your Instagram account may not be connected to a Facebook Page
- Go to Facebook Business Settings to verify Page-Instagram connection

### Step 3.6: Grant Permissions

**Purpose**: Authorize the application

**Manual Steps**:
1. Review the permissions carefully
2. Click **"Continue"** or **"Authorize"**
3. Wait for redirect

**Expected Behavior**:
- Facebook processes the authorization
- Redirects back to: `http://localhost:3000/api/auth/callback?code=...`
- Application processes the code
- Redirects to homepage: `http://localhost:3000`

**Debug Check**:
- ✅ No "access_denied" in URL
- ✅ No error messages displayed
- ✅ Redirects back to localhost

---

## Stage 4: Post-Authentication Verification

### Step 4.1: Verify Homepage Status

**Purpose**: Confirm authentication was successful

**Expected UI State**:
- Status shows: "Fully Authenticated"
- Green checkmark icon
- "Tokens are active and ready for use" message
- Webhook endpoint is now visible
- "Quick Test Suite" section is visible
- "Open Debug Center" link is visible

**Debug Check**:
- ✅ Status changed from "Disconnected" to "Fully Authenticated"
- ✅ UI shows green success state
- ✅ Webhook URL is displayed

### Step 4.2: Verify Token Storage

**Purpose**: Confirm tokens were saved correctly

```bash
# Check tokens file
cat data/tokens.json
```

**Expected Output**:
```json
{
  "access_token": "EAALWXOiGtWc...",
  "expires_at": 1773655915900
}
```

**Debug Check**:
- ✅ `access_token` is present and long (100+ characters)
- ✅ `expires_at` is a timestamp in the future
- ✅ File is valid JSON

### Step 4.3: Verify Token with Facebook Graph API

**Purpose**: Ensure the token is valid and has correct permissions

```bash
# Test the token directly with Facebook Graph API
# Replace YOUR_TOKEN with the actual token from tokens.json
curl "https://graph.facebook.com/v18.0/me?fields=id,name&access_token=YOUR_TOKEN"
```

**Expected Output**:
```json
{
  "id": "123456789",
  "name": "Your Name"
}
```

**Debug Check**:
- ✅ Returns user data (not an error)
- ✅ No "Invalid OAuth access token" error

### Step 4.4: Verify Token Permissions

**Purpose**: Confirm the token has all required scopes

```bash
# Check what permissions the token has
curl "https://graph.facebook.com/v18.0/me/permissions?access_token=YOUR_TOKEN"
```

**Expected Output**:
```json
{
  "data": [
    {"permission": "instagram_basic", "status": "granted"},
    {"permission": "instagram_content_publish", "status": "granted"},
    {"permission": "pages_read_engagement", "status": "granted"},
    {"permission": "pages_show_list", "status": "granted"},
    {"permission": "public_profile", "status": "granted"}
  ]
}
```

**Debug Check**:
- ✅ All 4 Instagram/Pages permissions show "granted"
- ✅ No permissions show "declined"

### Step 4.5: Verify Facebook Pages Access

**Purpose**: Ensure the token can access your Facebook Pages

```bash
# List Facebook Pages
curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN"
```

**Expected Output**:
```json
{
  "data": [
    {
      "access_token": "EAALWXOiGtWc...",
      "category": "Personal Blog",
      "name": "Your Page Name",
      "id": "123456789",
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT"]
    }
  ]
}
```

**Debug Check**:
- ✅ Returns at least one page
- ✅ Page has an `access_token`
- ✅ Page has `CREATE_CONTENT` in tasks

**CRITICAL**: If this returns empty `data: []`:
- Your Facebook account has no Pages
- You need to create a Facebook Page first
- Instagram Business Account must be connected to this Page

### Step 4.6: Verify Instagram Business Account Access

**Purpose**: Ensure we can access the Instagram account

```bash
# Get Instagram Business Account ID from Page
# Replace PAGE_ID with the ID from previous step
curl "https://graph.facebook.com/v18.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
```

**Expected Output**:
```json
{
  "instagram_business_account": {
    "id": "987654321"
  },
  "id": "123456789"
}
```

**Debug Check**:
- ✅ Returns `instagram_business_account` with an ID
- ✅ ID is present (not null)

**CRITICAL**: If `instagram_business_account` is missing:
- Your Facebook Page is not connected to an Instagram Business Account
- Go to Facebook Page Settings > Instagram to connect
- Must be a Business or Creator account (not Personal)

---

## Stage 5: Application-Level Debugging

### Step 5.1: Use Built-in Debug Dashboard

**Purpose**: View detailed authentication state in the app

**Manual Steps**:
1. In your browser (still in incognito), click **"Open Debug Center"**
2. Or navigate to: `http://localhost:3000/debug`

**Expected Information**:
- Token status
- Token expiration
- Available permissions
- Connected Facebook Pages
- Connected Instagram accounts

**Debug Check**:
- ✅ All information displays correctly
- ✅ No "undefined" or "null" values
- ✅ Instagram account is listed

### Step 5.2: Test Story Publishing Capability

**Purpose**: Verify end-to-end functionality

**Manual Steps**:
1. On homepage, scroll to "Quick Test Suite"
2. Enter a test image URL (or use the default)
3. Click "Publish Test Story"
4. Wait for response

**Expected Behavior**:
- Success message appears
- Story ID is returned
- Story appears on your Instagram account within a few minutes

**Debug Check**:
- ✅ No errors in response
- ✅ Returns a creation ID
- ✅ Check Instagram app to verify story was posted

---

## Stage 6: Common Issues & Troubleshooting

### Issue 1: "App Not Setup" Error

**Symptoms**: Facebook shows "App Not Setup: This app is still in development mode"

**Solution**:
1. Go to Facebook Developer Console
2. Settings > Basic
3. Add your Facebook account to "App Roles" as Administrator or Developer
4. Try authentication again

### Issue 2: "Redirect URI Mismatch"

**Symptoms**: Error about redirect_uri not matching

**Solution**:
1. Verify exact match in Facebook App Settings
2. Check for trailing slashes
3. Ensure http vs https matches
4. Restart dev server after changes

### Issue 3: "No Pages Found"

**Symptoms**: Empty pages list or missing Instagram account

**Solution**:
1. Create a Facebook Page if you don't have one
2. Convert Instagram to Business/Creator account
3. Connect Instagram to Facebook Page in Page Settings
4. Wait 5-10 minutes for Meta to sync
5. Try authentication again

### Issue 4: Token Works But Can't Publish

**Symptoms**: Authentication succeeds but publishing fails

**Solution**:
1. Verify all 4 permissions are granted (Step 4.4)
2. Check Instagram account is Business/Creator (not Personal)
3. Verify Page has CREATE_CONTENT task (Step 4.5)
4. Check App Review status for permissions

### Issue 5: "Invalid OAuth Access Token"

**Symptoms**: Token validation fails

**Solution**:
1. Token may have expired - check `expires_at`
2. Token may have been revoked - re-authenticate
3. App Secret may be wrong - verify in .env.local
4. Try the "Extend Token" button on homepage

---

## Stage 7: Success Criteria

You have successfully completed authentication when:

- ✅ Homepage shows "Fully Authenticated" status
- ✅ `data/tokens.json` contains valid token
- ✅ Token validation returns user data (Step 4.3)
- ✅ All 4 permissions show "granted" (Step 4.4)
- ✅ Facebook Pages are accessible (Step 4.5)
- ✅ Instagram Business Account is linked (Step 4.6)
- ✅ Debug dashboard shows all data correctly
- ✅ Test story publishes successfully

---

## Next Steps After Successful Authentication

1. **Set Up Webhook**: Configure your webhook URL in external services
2. **Test Webhook**: Send test POST requests to `/api/webhook/story`
3. **Monitor Logs**: Check terminal for incoming webhook requests
4. **Production Setup**: 
   - Deploy to production (Vercel, etc.)
   - Update redirect URIs in Facebook App
   - Update environment variables
   - Switch app from Development to Live mode

---

## Quick Reference: Important URLs

- **Application**: http://localhost:3000
- **Debug Dashboard**: http://localhost:3000/debug
- **Auth Endpoint**: http://localhost:3000/api/auth
- **Callback Endpoint**: http://localhost:3000/api/auth/callback
- **Webhook Endpoint**: http://localhost:3000/api/webhook/story
- **Facebook Developer Console**: https://developers.facebook.com/apps/798644479898983
- **Facebook Business Settings**: https://business.facebook.com/settings
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer

---

## Debugging Commands Cheat Sheet

```bash
# View tokens
cat data/tokens.json

# Clear tokens
echo {} > data/tokens.json

# Test auth endpoint
curl -I http://localhost:3000/api/auth

# Validate token
curl "https://graph.facebook.com/v18.0/me?access_token=YOUR_TOKEN"

# Check permissions
curl "https://graph.facebook.com/v18.0/me/permissions?access_token=YOUR_TOKEN"

# List pages
curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN"

# Get Instagram account
curl "https://graph.facebook.com/v18.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
```

---

**Remember**: Always use incognito mode when testing fresh authentication flows to avoid cached sessions and cookies!
