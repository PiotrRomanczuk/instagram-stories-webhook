# Implementation Plan: Instagram User Tagging for Meme Submissions

## Overview

Enable users to tag Instagram accounts when submitting memes, **before admin approval**. Tags will be preserved through the approval workflow and applied when the meme is published to Instagram.

## Current State Analysis

### Already Implemented ✅
- `scheduled_posts` table has `user_tags` JSONB column
- `addScheduledPost()` accepts and stores `userTags`
- `publishMedia()` sends `userTags` to Instagram Graph API
- `UserTag` type: `{ username: string; x: number; y: number }`

### Missing for Meme Submissions ❌
1. Database column for `user_tags` on `meme_submissions`
2. Type definitions for meme tagging
3. Validation schema for tag input
4. API support for saving/updating tags
5. UI components for adding tags
6. Flow to pass tags from meme → scheduled_post

---

## Implementation Tasks

### Phase 1: Database & Types (Backend Foundation)

#### Task 1.1: Database Migration
**File**: `supabase/migrations/YYYYMMDDHHMMSS_add_user_tags_to_memes.sql`

```sql
-- Add user_tags column to meme_submissions
ALTER TABLE public.meme_submissions
ADD COLUMN IF NOT EXISTS user_tags JSONB DEFAULT '[]'::jsonb;

-- Create index for querying memes with tags
CREATE INDEX IF NOT EXISTS idx_meme_submissions_user_tags
ON public.meme_submissions USING GIN (user_tags);

COMMENT ON COLUMN public.meme_submissions.user_tags IS
'Array of Instagram user tags: [{ username: string, x?: number, y?: number }]';
```

#### Task 1.2: Update Types
**File**: `lib/types/posts.ts`

```typescript
// Update MemeSubmission interface
export interface MemeSubmission {
    // ... existing fields
    user_tags?: UserTag[];  // Add this field
}

// Update MemeSubmissionRow interface
export interface MemeSubmissionRow {
    // ... existing fields
    user_tags?: UserTag[] | null;  // Add this field
}

// Update CreateMemeInput interface
export interface CreateMemeInput {
    // ... existing fields
    user_tags?: UserTag[];  // Add this field
}

// Update mapMemeSubmissionRow function
export function mapMemeSubmissionRow(row: MemeSubmissionRow): MemeSubmission {
    return {
        // ... existing mappings
        user_tags: row.user_tags || [],  // Add this mapping
    };
}
```

#### Task 1.3: Update Validation Schema
**File**: `lib/validations/meme.schema.ts`

```typescript
// Add UserTag schema
const userTagSchema = z.object({
    username: z
        .string()
        .min(1, 'Username is required')
        .max(30, 'Instagram username max 30 chars')
        .regex(/^[a-zA-Z0-9._]+$/, 'Invalid Instagram username format'),
    x: z.number().min(0).max(1).optional().default(0.5),
    y: z.number().min(0).max(1).optional().default(0.5),
});

// Update submitMemeSchema
export const submitMemeSchema = z.object({
    // ... existing fields
    userTags: z
        .array(userTagSchema)
        .max(20, 'Maximum 20 tags allowed')
        .optional()
        .default([]),
});

// Update updateMemeSubmissionSchema to include userTags
export const updateMemeSubmissionSchema = z.object({
    title: z.string().max(100).optional(),
    caption: z.string().max(2200).optional(),
    userTags: z.array(userTagSchema).max(20).optional(),
}).refine(
    (data) => data.title || data.caption || data.userTags,
    { message: 'At least one field is required' }
);
```

---

### Phase 2: API Layer

#### Task 2.1: Update Meme DB Functions
**File**: `lib/memes-db.ts`

```typescript
// Update createMemeSubmission to accept user_tags
export async function createMemeSubmission(input: CreateMemeInput): Promise<MemeSubmission | null> {
    const { data, error } = await supabaseAdmin
        .from('meme_submissions')
        .insert({
            user_id: input.user_id,
            user_email: input.user_email,
            media_url: input.media_url,
            storage_path: input.storage_path,
            title: input.title,
            caption: input.caption,
            user_tags: input.user_tags || [],  // ADD THIS
            status: 'pending'
        })
        .select()
        .single();
    // ...
}

// Add function to update meme tags
export async function updateMemeSubmission(
    id: string,
    updates: { title?: string; caption?: string; user_tags?: UserTag[] }
): Promise<MemeSubmission | null> {
    const { data, error } = await supabaseAdmin
        .from('meme_submissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    // ...
}
```

#### Task 2.2: Update POST /api/memes
**File**: `app/api/memes/route.ts`

```typescript
// Update to pass userTags
const meme = await createMemeSubmission({
    user_id: userId,
    user_email: userEmail,
    media_url: validated.mediaUrl,
    storage_path: validated.storagePath,
    title: validated.title,
    caption: validated.caption,
    user_tags: validated.userTags,  // ADD THIS
});
```

#### Task 2.3: Update PATCH /api/memes/[id]/edit
**File**: `app/api/memes/[id]/edit/route.ts`

Update to accept and validate `userTags` in the request body.

#### Task 2.4: Update Schedule Route
**File**: `app/api/memes/[id]/schedule/route.ts`

```typescript
// Pass user_tags from meme to scheduled post
const scheduledPost = await addScheduledPost({
    url: meme.media_url,
    type: 'IMAGE',
    postType: 'STORY',
    caption: meme.caption,
    scheduledTime: scheduled_time,
    userId: adminId,
    userTags: meme.user_tags,  // ADD THIS - pass tags to scheduled post
});
```

---

### Phase 3: Frontend UI

#### Task 3.1: Create Tag Input Component
**File**: `app/components/memes/tag-input.tsx`

```typescript
'use client';

interface TagInputProps {
    tags: { username: string; x?: number; y?: number }[];
    onChange: (tags: { username: string; x: number; y: number }[]) => void;
    maxTags?: number;
    disabled?: boolean;
}

export function TagInput({ tags, onChange, maxTags = 20, disabled }: TagInputProps) {
    // Input for adding @username
    // Display list of added tags with remove button
    // Validation feedback for invalid usernames
    // Show count: "3/20 tags"
}
```

Features:
- Text input with @ prefix auto-added
- Validates Instagram username format on blur/enter
- Shows tag chips with X to remove
- Prevents duplicates
- Shows remaining count

#### Task 3.2: Update Meme Submit Form
**File**: `app/components/memes/meme-submit-form.tsx`

Add the TagInput component to the form:
```tsx
<TagInput
    tags={watch('userTags') || []}
    onChange={(tags) => setValue('userTags', tags)}
    disabled={isSubmitting}
/>
```

#### Task 3.3: Update Meme Edit Modal
**File**: `app/components/memes/meme-edit-modal.tsx`

Add tag editing capability:
```tsx
// Add state for tags
const [editTags, setEditTags] = useState(meme.user_tags || []);

// Add TagInput in the form
<TagInput
    tags={editTags}
    onChange={setEditTags}
/>

// Include in save handler
onSave({ title, caption, user_tags: editTags });
```

#### Task 3.4: Display Tags in Meme Cards
**File**: `app/components/memes/meme-card.tsx`

Show tag count/preview on meme cards:
```tsx
{meme.user_tags?.length > 0 && (
    <div className="flex items-center gap-1 text-xs text-gray-500">
        <AtSign className="w-3 h-3" />
        {meme.user_tags.length} tag{meme.user_tags.length !== 1 ? 's' : ''}
    </div>
)}
```

---

### Phase 4: Testing

#### Task 4.1: Unit Tests
**File**: `__tests__/unit/validations/meme.schema.test.ts`

```typescript
describe('userTags validation', () => {
    it('accepts valid Instagram usernames', () => {});
    it('rejects invalid characters in username', () => {});
    it('rejects more than 20 tags', () => {});
    it('provides default x,y coordinates', () => {});
});
```

#### Task 4.2: Integration Tests
**File**: `__tests__/integration/api/memes.test.ts`

```typescript
describe('POST /api/memes with tags', () => {
    it('creates meme submission with user tags', () => {});
    it('stores tags correctly in database', () => {});
});

describe('PATCH /api/memes/[id]/edit with tags', () => {
    it('updates tags on existing submission', () => {});
});
```

#### Task 4.3: Component Tests
**File**: `__tests__/components/memes/tag-input.test.tsx`

```typescript
describe('TagInput', () => {
    it('adds tag on enter key', () => {});
    it('removes tag on click', () => {});
    it('prevents duplicate usernames', () => {});
    it('validates username format', () => {});
    it('enforces max tag limit', () => {});
});
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SUBMITS MEME                            │
│  meme-submit-form.tsx                                           │
│  - Upload media                                                 │
│  - Add title/caption                                            │
│  - Add tags: @user1, @user2  ← NEW                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/memes                              │
│  - Validates userTags array                                     │
│  - Calls createMemeSubmission()                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    meme_submissions TABLE                       │
│  id | media_url | caption | user_tags | status                  │
│  ─────────────────────────────────────────────                  │
│  1  | url...    | ...     | [{"username":"user1","x":0.5...}]   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ (Admin approves & schedules)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                POST /api/memes/[id]/schedule                    │
│  - Reads meme.user_tags                                         │
│  - Passes to addScheduledPost({ userTags: meme.user_tags })     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    scheduled_posts TABLE                        │
│  id | url | user_tags | scheduled_time | status                 │
│  ─────────────────────────────────────────────                  │
│  1  | url | [{"username":"user1"...}] | 1706400000 | pending    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ (Cron processes at scheduled time)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    publishMedia()                               │
│  - Sends to Instagram API with user_tags parameter              │
│  - Tagged users receive notification                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order (Recommended)

1. **Database migration** - Foundation for everything
2. **Type definitions** - Enable TypeScript support
3. **Validation schema** - Input validation
4. **Database functions** - Save/retrieve tags
5. **API routes** - Wire up backend
6. **TagInput component** - Reusable UI
7. **Submit form integration** - User-facing feature
8. **Edit modal integration** - Allow tag changes
9. **Card display** - Show tag info
10. **Tests** - Ensure reliability

---

## Edge Cases to Handle

1. **User enters username with @** - Strip @ prefix automatically
2. **Private Instagram accounts** - Tags may silently fail (Instagram limitation)
3. **Non-existent usernames** - Instagram API will ignore them
4. **Duplicate usernames** - Prevent in UI, dedupe on save
5. **Empty tags array** - Default to `[]`, not `null`
6. **Meme edited after approval** - Tags persist through status changes

---

## Instagram API Limitations

- Maximum **20 tags** per post
- Tags only work on **public accounts**
- For Stories, `x` and `y` coordinates are optional (defaults to mention sticker)
- For Feed posts, coordinates are **required**
- Username must match exactly (case-insensitive lookup by IG)

---

## Files to Modify/Create

### Create New
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_add_user_tags_to_memes.sql`
- [ ] `app/components/memes/tag-input.tsx`
- [ ] `__tests__/components/memes/tag-input.test.tsx`

### Modify
- [ ] `lib/types/posts.ts` - Add user_tags to MemeSubmission types
- [ ] `lib/validations/meme.schema.ts` - Add userTags validation
- [ ] `lib/memes-db.ts` - Handle user_tags in CRUD operations
- [ ] `app/api/memes/route.ts` - Accept userTags in POST
- [ ] `app/api/memes/[id]/edit/route.ts` - Accept userTags in PATCH
- [ ] `app/api/memes/[id]/schedule/route.ts` - Pass userTags to scheduled post
- [ ] `app/components/memes/meme-submit-form.tsx` - Add TagInput
- [ ] `app/components/memes/meme-edit-modal.tsx` - Add TagInput
- [ ] `app/components/memes/meme-card.tsx` - Display tag count
- [ ] `__tests__/unit/validations/meme.schema.test.ts` - Tag validation tests
- [ ] `__tests__/integration/api/memes.test.ts` - API integration tests

---

## Success Criteria

1. User can add 1-20 Instagram usernames when submitting a meme
2. Tags are stored in `meme_submissions.user_tags` JSONB column
3. User can edit tags on their own pending submissions
4. Admin can see tags when reviewing memes
5. Tags flow from meme → scheduled_post when scheduled
6. Tags are sent to Instagram API when published
7. All existing tests still pass
8. New tests cover tag functionality

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Database & Types | 3 tasks | Low |
| Phase 2: API Layer | 4 tasks | Medium |
| Phase 3: Frontend UI | 4 tasks | Medium |
| Phase 4: Testing | 3 tasks | Medium |

**Total**: ~14 tasks across 4 phases
