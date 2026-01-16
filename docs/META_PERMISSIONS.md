# 🔐 Meta Permissions Reference

This document outlines the current permissions used by the application and additional permissions that would be beneficial for future features such as analytics, engagement, and scaling.

## 📋 Current Permissions

These permissions are currently required for the core functionality of publishing and scheduling Instagram Stories.

| Permission | Purpose |
| :--- | :--- |
| `instagram_basic` | Get basic metadata of an Instagram Professional account profile (username, ID). |
| `instagram_content_publish` | Manage organic content creation (post photos, videos, and stories). |
| `pages_show_list` | Show a person the list of Pages they manage and verify Page ownership. |
| `pages_read_engagement` | Access Page and media engagement data (required as a dependency for IG publishing). |

---

## 🚀 Recommended Additions

Based on the [Meta Permissions Documentation](https://developers.facebook.com/docs/permissions), the following scopes are recommended for upcoming features.

### 1. `instagram_manage_insights` (Priority: High)
*   **Feature:** Analytics & Reporting.
*   **Description:** Allows the app to retrieve metadata and insights for an Instagram professional account and its media (stories, posts).
*   **Use Case:** Building a performance dashboard to see view counts, reach, and engagement for memes/stories.

### 2. `instagram_manage_comments` (Priority: Medium)
*   **Feature:** Community Management.
*   **Description:** Allows reading, replying to, and deleting comments on Instagram media.
*   **Use Case:** A "Comments Manager" tab where users can reply to feedback without leaving the app.

### 3. `instagram_manage_messages` (Priority: Medium)
*   **Feature:** Direct Engagement.
*   **Description:** Grants access to the Instagram Direct inbox.
*   **Use Case:** Handling story replies (which arrive as DMs) or automating "Link in Bio" style replies.

### 4. `instagram_manage_contents` (Priority: Low)
*   **Feature:** Content Management.
*   **Description:** Allows deleting an Instagram post, story, or reel.
*   **Use Case:** Revoking or removing posts programmatically if they are flagged or expired.

---

## 🛡️ Scaling & Business Permissions

### 5. `pages_read_user_content`
*   **Feature:** UGC & Brand Tracking.
*   **Description:** Get user-generated content on your Page or posts that your Page is tagged in.
*   **Use Case:** Reposting content when followers tag the account in their own stories.

### 6. `business_management`
*   **Feature:** Multi-User / Enterprise.
*   **Description:** Programmatically manage Business Manager assets.
*   **Use Case:** Required for complex multi-business setups or managing assets on behalf of clients at scale.

---

## 🛠️ Implementation Note

To add these permissions:
1.  Update the `SCOPE` variable in your Facebook Login configuration (usually in `.env` or the Auth provider setup).
2.  Users will need to **re-authenticate** to grant the new scopes.
3.  Ensure the App Review process covers these permissions if moving to **Live Mode**.

---
*Last Updated: 2026-01-16*
