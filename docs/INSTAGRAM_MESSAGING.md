# 📨 Instagram Messaging Integration

Complete guide to using Instagram Direct Messages (DMs) via the Meta Messenger Platform API.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Setup](#setup)
- [Architecture](#architecture)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Rate Limits](#rate-limits)
- [Webhook Configuration](#webhook-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Instagram Messaging integration allows you to:

- **Receive** Instagram DMs from customers in real-time via webhooks
- **Send** replies directly from the application
- **View** conversation history and manage multiple conversations
- **Sync** messages with Instagram's servers on-demand

This feature uses Meta's Messenger Platform API for Instagram, which requires the `instagram_manage_messages` permission.

---

## Features

### ✅ Implemented

- **Real-time message reception** via Instagram webhooks
- **Conversation management** with participant details
- **Message sending** (text and images)
- **Message history** stored in database
- **Unread message tracking** with badge indicators
- **Sync on-demand** to fetch latest conversations/messages from Instagram
- **Rate limit handling** (200 messages/hour)
- **Responsive UI** with modern design

### 🔮 Future Enhancements

- **Quick reply templates** for common responses
- **Auto-replies** based on trigger keywords
- **Message search** and filtering
- **File attachments** (videos, audio)
- **Message analytics** (response time, volume)
- **Multi-user support** with assignment

---

## Setup

### 1. Meta App Configuration

#### Enable Instagram Messaging API

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Select your app
3. Click **Add Product** → **Messenger**
4. In **Webhooks** section:
   - Click **Add Callback URL**
   - Enter: `https://your-domain.com/api/webhook/instagram`
   - Verify Token: Set in environment as `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
   - Click **Verify and Save**

#### Subscribe to Webhook Fields

1. In Webhooks section, find your Instagram page
2. Click **Subscribe to this object**
3. Select **messages** field
4. Save

#### Request Advanced Access

1. Go to **App Review** → **Permissions and Features**
2. Find `instagram_manage_messages`
3. Click **Request Advanced Access**
4. Submit for review (required for production)

### 2. Environment Variables

Add to `.env.local`:

```bash
# Instagram Webhook Verification Token
# This should match what you entered in Meta's webhook setup
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_secure_random_token_here

# Or reuse existing webhook secret
WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Migration

Run the migration to create messaging tables:

```bash
# If using Supabase CLI locally
supabase migration up

# Or apply via Supabase Dashboard → SQL Editor
# Run: supabase/migrations/20260127000000_instagram_messaging.sql
```

### 4. Page Subscription

Subscribe your Instagram page to receive webhook events:

```bash
# Use Graph API Explorer or run this curl command
curl -X POST "https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps" \
  -d "access_token={ACCESS_TOKEN}" \
  -d "subscribed_fields=messages"
```

Replace:
- `{PAGE_ID}`: Your Facebook Page ID
- `{ACCESS_TOKEN}`: Your Page Access Token

---

## Architecture

### Data Flow

```
Instagram User
    ↓ (sends DM)
Meta Webhook → /api/webhook/instagram
    ↓ (validates & processes)
Database (instagram_messages, instagram_conversations)
    ↓ (real-time updates)
UI (Inbox → Conversation → Message Thread)
    ↓ (user replies)
/api/messages/send
    ↓ (sends via Instagram API)
Instagram User (receives reply)
```

### Database Tables

#### `instagram_conversations`
Stores conversation metadata between business and users.

#### `instagram_messages`
Individual messages within conversations.

#### `message_templates` (future)
Reusable templates for quick replies.

See [Database Schema](#database-schema) for full details.

---

## Usage

### Accessing the Inbox

1. Navigate to `/inbox` in the application
2. Click **Sync** to fetch latest conversations from Instagram
3. Select a conversation to view messages
4. Type a message and click **Send** to reply

### Sending Messages

```typescript
// Via API endpoint
const response = await fetch('/api/messages/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'uuid-of-conversation',
    messageText: 'Hello! How can I help you?',
    messageType: 'text',
  }),
});
```

### Sending Images

```typescript
const response = await fetch('/api/messages/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversationId: 'uuid-of-conversation',
    imageUrl: 'https://example.com/image.jpg',
    messageType: 'image',
  }),
});
```

---

## API Reference

### GET `/api/messages/inbox`

Fetch all conversations for the authenticated user.

**Query Parameters:**
- `sync` (optional): Set to `'true'` to sync with Instagram API
- `limit` (optional): Number of conversations to return (default: 25)

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "participantUsername": "johndoe",
      "participantProfilePic": "https://...",
      "lastMessageText": "Hello!",
      "lastMessageAt": "2026-01-27T10:00:00Z",
      "unreadCount": 2
    }
  ],
  "count": 1
}
```

### GET `/api/messages/[id]`

Fetch messages from a specific conversation.

**Path Parameters:**
- `id`: UUID of the conversation

**Query Parameters:**
- `sync` (optional): Set to `'true'` to sync with Instagram API
- `limit` (optional): Number of messages to return (default: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "messageText": "Hello!",
      "isFromUser": false,
      "createdAt": "2026-01-27T10:00:00Z"
    }
  ],
  "count": 1,
  "conversation": {
    "id": "uuid",
    "participantUsername": "johndoe"
  }
}
```

### POST `/api/messages/send`

Send a message to a conversation participant.

**Request Body:**
```json
{
  "conversationId": "uuid",
  "messageText": "Hello! How can I help you?",
  "messageType": "text"
}
```

Or for images:
```json
{
  "conversationId": "uuid",
  "imageUrl": "https://example.com/image.jpg",
  "messageType": "image"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "ig_message_id_from_meta",
  "message": { ... }
}
```

**Rate Limit Error (429):**
```json
{
  "error": "Rate limit exceeded. Instagram allows 200 messages per hour.",
  "retryAfter": 3600
}
```

### POST `/api/webhook/instagram` (Meta Webhooks)

Receives webhook events from Instagram.

**Webhook Event Structure:**
```json
{
  "object": "instagram",
  "entry": [{
    "id": "instagram_user_id",
    "time": 1706356800,
    "messaging": [{
      "sender": { "id": "sender_igsid" },
      "recipient": { "id": "recipient_igsid" },
      "timestamp": 1706356800,
      "message": {
        "mid": "message_id",
        "text": "Hello!"
      }
    }]
  }]
}
```

### GET `/api/webhook/instagram` (Webhook Verification)

Meta sends verification requests during webhook setup.

**Query Parameters:**
- `hub.mode`: 'subscribe'
- `hub.verify_token`: Your verification token
- `hub.challenge`: Challenge string to echo back

---

## Database Schema

### `instagram_conversations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | References next_auth.users(id) |
| `ig_conversation_id` | text | Instagram's conversation ID |
| `participant_ig_id` | text | Instagram user ID of other person |
| `participant_username` | text | Their Instagram username |
| `participant_profile_pic` | text | Profile picture URL |
| `last_message_text` | text | Preview of last message |
| `last_message_at` | timestamptz | When last message was sent/received |
| `unread_count` | int | Number of unread messages |
| `is_active` | boolean | Conversation is active (not archived) |
| `created_at` | timestamptz | When conversation was created |
| `updated_at` | timestamptz | Last updated timestamp |

**Indexes:**
- `idx_conversations_user_id` on `user_id`
- `idx_conversations_ig_id` on `ig_conversation_id`
- `idx_conversations_last_message` on `(user_id, last_message_at DESC)`

### `instagram_messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `conversation_id` | uuid | References instagram_conversations(id) |
| `ig_message_id` | text | Instagram's message ID (unique) |
| `sender_ig_id` | text | Instagram ID of sender |
| `recipient_ig_id` | text | Instagram ID of recipient |
| `message_text` | text | Message content |
| `message_type` | text | 'text', 'image', 'video', 'story_reply' |
| `attachments` | jsonb | Array of attachment objects |
| `is_from_user` | boolean | true = from our account |
| `ig_created_time` | bigint | Unix timestamp from Instagram |
| `created_at` | timestamptz | When we received/sent it |

**Indexes:**
- `idx_messages_conversation` on `(conversation_id, created_at DESC)`
- `idx_messages_ig_id` on `ig_message_id`

### `message_templates`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | References next_auth.users(id) |
| `name` | text | Template name |
| `template_text` | text | Message content |
| `trigger_keywords` | text[] | Keywords for auto-reply |
| `is_active` | boolean | Template is active |
| `usage_count` | int | Number of times used |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Last updated timestamp |

---

## Rate Limits

### Instagram Messaging API Limits (2026)

| Operation | Limit | Window |
|-----------|-------|--------|
| **Send Messages** | 200 | Per hour |
| **API Calls** | 200 | Per hour |

**Important Notes:**
- Rate limits are **per Instagram Business Account**, not per app
- Limits were reduced from 5,000/hour to 200/hour in 2026
- Exceeding limits returns error code `368`
- Application handles rate limit errors with user-friendly messages

### Best Practices

1. **Batch operations** when possible
2. **Cache conversation data** to reduce API calls
3. **Use webhooks** instead of polling
4. **Implement retry logic** with exponential backoff
5. **Monitor usage** to stay under limits

---

## Webhook Configuration

### Webhook Verification

When Meta first sets up your webhook, they'll send a GET request:

```
GET /api/webhook/instagram?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

Your endpoint must:
1. Verify `hub.verify_token` matches your `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
2. Return the `hub.challenge` value as plain text response

### Webhook Events

Meta sends POST requests when events occur:

**Supported Events:**
- `messages` - New message received
- `message_echoes` - Confirmation of message we sent
- `message_reads` - User read our message (if supported)
- `postbacks` - User clicked quick reply button

### Security

Webhooks are **public endpoints** but protected by:

1. **Verification token** - Only Meta knows your verify token
2. **Event validation** - Validates payload structure
3. **Idempotency** - Handles duplicate events via unique message IDs
4. **Error handling** - Always returns 200 to prevent retries

---

## Troubleshooting

### Webhooks Not Receiving Events

**Check:**
1. Webhook URL is publicly accessible (not localhost)
2. SSL certificate is valid (HTTPS required)
3. Verification token matches Meta dashboard
4. Page is subscribed to `messages` field
5. Instagram account is linked via `/api/auth/link-facebook`

**Test webhook:**
```bash
curl -X GET "https://your-domain.com/api/webhook/instagram?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123
```

### Messages Not Sending

**Common Issues:**

**Error: "Permission denied"**
- Solution: Ensure `instagram_manage_messages` permission is granted with advanced access

**Error: "Rate limit exceeded"**
- Solution: Wait 1 hour or reduce message frequency
- Note: 200 messages/hour limit

**Error: "User is not eligible to receive messages"**
- Solution: Users must initiate conversations first. Businesses cannot send the first message.

**Error: "No active Facebook connection"**
- Solution: User needs to link Facebook account via `/settings` or `/api/auth/link-facebook`

### Conversations Not Syncing

**Symptoms:** Inbox shows old conversations or no conversations

**Solutions:**
1. Click **Sync** button in inbox UI
2. Check `linked_accounts` table has `ig_user_id` for the user
3. Verify access token hasn't expired
4. Check Supabase logs for API errors

### Database Issues

**Check RLS policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'instagram_conversations';
```

**Manually sync conversation:**
```sql
-- View conversations for a user
SELECT * FROM instagram_conversations WHERE user_id = 'user_id_here';

-- Reset unread count
UPDATE instagram_conversations SET unread_count = 0 WHERE id = 'conversation_id';
```

---

## Developer Notes

### Testing Locally

1. Use **ngrok** to expose localhost:
   ```bash
   ngrok http 3000
   ```

2. Update webhook URL in Meta dashboard to ngrok URL

3. Send test message from personal Instagram account

### API Response Examples

**Successful send:**
```json
{
  "recipient_id": "1234567890",
  "message_id": "mid.1234567890:abcdef"
}
```

**Rate limit error:**
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "OAuthException",
    "code": 368
  }
}
```

### Library Functions

```typescript
// lib/instagram/messages.ts

// Get conversations
const conversations = await getConversations(userId, limit);

// Get messages from a conversation
const messages = await getConversationMessages(conversationId, userId, limit);

// Send text message
const result = await sendMessage(recipientIgId, messageText, userId);

// Send image message
const result = await sendImageMessage(recipientIgId, imageUrl, userId);
```

---

## Related Documentation

- [Meta Permissions Reference](./META_PERMISSIONS.md)
- [Client Setup Guide](./CLIENT_SETUP_GUIDE.md)
- [Testing Guide](./TESTING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

*Last Updated: 2026-01-27*
