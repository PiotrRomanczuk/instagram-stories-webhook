# UI Redesign Prompt for StoryFlow Content Queue

## Project Context

**StoryFlow** is an Instagram Stories management dashboard built with Next.js 14, React, and Tailwind CSS. The application uses shadcn/ui components and needs a visual refresh to look more modern and professional.

## Current Tech Stack
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- shadcn/ui component library
- Lucide React icons
- Inter font family

## Design Reference

See the template screenshots in `/screenshots/stitch-project/` folder:
- `content_queue_dashboard_1/screen.png` - Main content queue with dark mode
- `content_queue_dashboard_2/screen.png` - Alternative queue layout
- `story_review_&_approval_panel_1/screen.png` - Review interface
- `analytics_&_creator_insights_1/screen.png` - Analytics dashboard

## Pages Requiring Redesign

### 1. My Submissions Page (`/submissions`)
**Current state:** Basic table/grid with broken image placeholders, generic styling
**Files to modify:**
- `app/components/submissions/submission-list.tsx`
- `app/components/submissions/submission-card.tsx`
- `app/components/submissions/submission-stats.tsx`
- `app/[locale]/submissions/page.tsx`

**Design requirements:**
- Phone-frame style cards showing content in 9:16 aspect ratio
- Status badges (Pending, Approved, Rejected, Published) with distinct colors
- Stats cards at the top showing: Pending, Approved, Scheduled, Published counts
- Quick action buttons: Edit, View, Delete
- Hover states with gradient overlays
- Creator info under each card (username, timestamp)
- Empty state with friendly illustration

### 2. Content Queue Page (`/content`)
**Current state:** Functional but visually plain
**Files to modify:**
- `app/components/content/content-list.tsx`
- `app/components/content/content-card.tsx`
- `app/[locale]/content/page.tsx`

**Design requirements:**
- Kanban-style columns: Draft, Scheduled, Processing, Published, Failed
- Drag-and-drop reordering for scheduled items
- Calendar mini-view for scheduled dates
- Progress indicators for processing items
- Batch selection with bulk actions

### 3. Review Page (`/review`)
**Current state:** Basic card-based review interface
**Files to modify:**
- `app/components/review/review-list.tsx`
- `app/[locale]/review/page.tsx`

**Design requirements:**
- Large preview with phone frame mockup
- Swipe-style approve/reject (or button-based)
- Keyboard shortcuts (A = approve, R = reject, arrow keys to navigate)
- Review history sidebar
- Daily goal progress indicator

### 4. Schedule Page (`/schedule`)
**Current state:** Simple list view
**Files to modify:**
- `app/components/schedule/scheduled-list.tsx`
- `app/[locale]/schedule/page.tsx`

**Design requirements:**
- Full calendar view (week/month/day)
- Time slots visualization
- Drag to reschedule
- Conflict detection

## Color Palette (Dark Mode Primary)

```css
:root {
  --primary: #2b6cee;
  --primary-hover: #5d95fb;
  --background-dark: #101622;
  --card-dark: #1a2332;
  --border-dark: #2a3649;
  --text-secondary: #92a4c9;
  --success: #10b981; /* emerald-500 */
  --warning: #eab308; /* yellow-500 */
  --error: #ef4444; /* red-500 */
  --info: #3b82f6; /* blue-500 */
}
```

## Component Patterns

### Phone Frame Card
```tsx
<div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-card-dark border border-border-dark">
  <img src={mediaUrl} className="h-full w-full object-cover" />
  <div className="absolute left-2 top-2">
    <Badge variant="pending">Pending</Badge>
  </div>
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
    <p className="text-sm font-medium text-white truncate">{caption}</p>
    <p className="text-xs text-text-secondary">{creator} · {time}</p>
  </div>
</div>
```

### Stats Card
```tsx
<div className="rounded-xl border border-border-dark bg-card-dark p-5">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-text-secondary">Pending Review</p>
      <h3 className="mt-2 text-3xl font-bold text-white">12</h3>
    </div>
    <div className="rounded-lg bg-yellow-500/10 p-2 text-yellow-500">
      <PendingIcon className="h-6 w-6" />
    </div>
  </div>
  <div className="mt-4 flex items-center text-xs text-text-secondary">
    <span className="text-emerald-500 flex items-center gap-1">
      <TrendingUp className="h-4 w-4" /> +4
    </span>
    <span className="ml-2">since yesterday</span>
  </div>
</div>
```

### Status Badge Variants
```tsx
// Pending - Yellow
<Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
  <Clock className="h-3 w-3 mr-1" /> Pending
</Badge>

// Approved - Emerald
<Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
  <Check className="h-3 w-3 mr-1" /> Approved
</Badge>

// Rejected - Red
<Badge className="bg-red-500/10 text-red-500 border-red-500/20">
  <X className="h-3 w-3 mr-1" /> Rejected
</Badge>

// Published - Blue
<Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
  <Send className="h-3 w-3 mr-1" /> Published
</Badge>
```

## Sidebar Navigation

```tsx
<aside className="w-64 border-r border-border-dark bg-[#111722]">
  <div className="flex h-16 items-center px-6">
    <AutoStories className="h-7 w-7 text-primary" />
    <span className="ml-2 text-xl font-bold">StoryFlow</span>
  </div>

  <nav className="space-y-1 p-4">
    <NavLink href="/" icon={Dashboard}>Dashboard</NavLink>
    <NavLink href="/content" icon={Queue} active badge={12}>Content Queue</NavLink>
    <NavLink href="/schedule" icon={Calendar}>Calendar</NavLink>
    <NavLink href="/analytics" icon={Analytics}>Analytics</NavLink>

    <Separator className="my-4" />
    <p className="px-2 text-xs font-semibold text-text-secondary">SYSTEM</p>

    <NavLink href="/users" icon={Group}>Creators</NavLink>
    <NavLink href="/settings" icon={Settings}>Settings</NavLink>
  </nav>
</aside>
```

## Image Fallback Pattern

Always use the `MediaThumbnail` component for displaying media:

```tsx
import { MediaThumbnail } from '@/app/components/ui/media-thumbnail';

<MediaThumbnail
  src={item.mediaUrl}
  aspectRatio="story"
  showPlayIcon={item.mediaType === 'VIDEO'}
/>
```

## Animation & Interactions

- Card hover: Scale 1.02, subtle shadow increase
- Status transitions: Fade + slide
- Loading states: Skeleton with pulse animation
- Toast notifications: Slide in from bottom-right
- Modal dialogs: Fade + scale from center

## Accessibility Requirements

- All interactive elements must have visible focus states
- Color contrast must meet WCAG AA (4.5:1 for text)
- Images must have alt text or aria-labels
- Keyboard navigation must work throughout

## Files to Reference

The HTML templates are in `/screenshots/stitch-project/*/code.html` - these show the complete styling with Tailwind classes that can be adapted to React components.

## Priority Order

1. Fix broken images (use MediaThumbnail everywhere)
2. Update color scheme to match dark theme
3. Redesign submission cards with phone frames
4. Add stats cards to pages
5. Improve navigation/sidebar
6. Add better loading states
7. Polish animations and interactions
