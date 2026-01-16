# Implementation Plan: Instagram User Tagging for Stories

This document outlines the plan for implementing user tagging in Instagram Stories (and Feed posts) via the Instagram Graph API.

## 1. Overview
As of the latest API updates (v24.0), it is possible to programmatically tag public Instagram users in Stories, Feed posts, and Reels using the `user_tags` parameter. This feature is critical for increasing engagement and notifying collaborators.

## 2. Technical Requirements
- **Endpoint**: `POST /<IG_ID>/media`
- **Parameter**: `user_tags` (Stringified JSON array of objects)
- **Object Structure**:
  ```json
  [
    { "username": "ig_user_1", "x": 0.5, "y": 0.5 },
    { "username": "ig_user_2" }
  ]
  ```
  - `username`: Required. Must be a public account.
  - `x`: Optional for Stories, Required for Feed Images. Float 0.0 to 1.0 (left to right).
  - `y`: Optional for Stories, Required for Feed Images. Float 0.0 to 1.0 (top to bottom).

## 3. Implementation Steps

### Phase 1: Data Model Updates
1. **Types (`lib/types.ts`)**:
   - Create a `UserTag` interface.
   - Add `userTags?: UserTag[]` to the `ScheduledPost` interface.
2. **Database (`Supabase`)**:
   - Add a `user_tags` column (type: `JSONB`) to the `scheduled_posts` table.
3. **DB Layer (`lib/scheduled-posts-db.ts`)**:
   - Update `addScheduledPost`, `updateScheduledPost`, and mapping functions to handle the new `user_tags` column.

### Phase 2: Publishing Logic
1. **Instagram Library (`lib/instagram/publish.ts`)**:
   - Update `publishMedia` function signature to accept `userTags`.
   - Add logic to stringify the tags: `containerData.user_tags = JSON.stringify(userTags)`.
2. **Scheduling Engine (`app/api/schedule/process/route.ts`)**:
   - Extract `userTags` from the stored post object and pass it to `publishMedia`.

### Phase 3: API & UI Updates
1. **Scheduling API (`app/api/schedule/route.ts`)**:
   - Update the `POST` handler to validate and accept an array of `user_tags`.
2. **Frontend UI** (Future):
   - Add a "Tag Users" input in the story scheduling form.
   - Implement simple validation to ensure usernames are provided.

## 4. Limitations & Considerations
- **Public Accounts Only**: Tagging private accounts will result in an API error or the tag simply not appearing.
- **Max Tags**: Instagram limits tagging to 20 users per media object.
- **Formatting**: The `user_tags` value must be a valid JSON string when sent in the `multipart/form-data` or JSON body.
- **Stories Coordinates**: If `x` and `y` are omitted for Stories, the tag is treated as a "mention" sticker in the background.

## 5. Verification Plan
1. Schedule a story with 1-2 known public test usernames.
2. Verify the `POST /media` request contains the correct stringified `user_tags`.
3. Check the published story on a mobile device to confirm notifications were sent and the mention is active.
