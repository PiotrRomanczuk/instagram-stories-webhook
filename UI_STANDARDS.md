# UI Standards - StoryFlow Application

## Overview
This document defines the UI standards for all pages in the StoryFlow application. Every page must adhere to these standards for consistency.

---

## Pages Inventory

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Main landing page with stats and quick actions |
| `/analytics` | Analytics | Performance metrics and charts |
| `/auth/signin` | Sign In | Authentication page |
| `/auth/verify-request` | Verify Request | Email verification pending |
| `/content` | Content Queue | Kanban board for content management |
| `/debug` | Debug | Developer debugging tools |
| `/developer` | Developer | Developer dashboard |
| `/developer/cron-debug` | Cron Debug | Cron job debugging |
| `/inbox` | Inbox | Direct messages management |
| `/insights` | Insights | Instagram insights and quota |
| `/memes` | Memes Library | Meme management |
| `/memes/submit` | Submit Meme | Meme submission form |
| `/review` | Review | Admin story review queue |
| `/schedule` | Schedule | Calendar scheduling view |
| `/settings` | Settings | App settings |
| `/submissions` | My Submissions | User's submission history |
| `/submit` | Submit | Quick submission form |
| `/users` | Users | User management (admin) |

---

## Theme Standards

### 1. Light/Dark Mode Support (REQUIRED)
Every page MUST support both light and dark mode using Tailwind's `dark:` prefix.

```tsx
// ✅ CORRECT - Supports both modes
<div className="bg-white dark:bg-[#101622]">
<p className="text-gray-900 dark:text-white">

// ❌ WRONG - Hardcoded dark only
<div className="bg-[#101622]">
<p className="text-white">
```

### 2. Color Palette

#### Backgrounds
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Page background | `bg-gray-50` | `dark:bg-[#101622]` |
| Card/Surface | `bg-white` | `dark:bg-[#1a2332]` |
| Sidebar | `bg-white` | `dark:bg-[#111722]` |
| Hover state | `hover:bg-gray-100` | `dark:hover:bg-[#232f48]` |

#### Text
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary text | `text-gray-900` | `dark:text-white` |
| Secondary text | `text-gray-500` | `dark:text-[#92a4c9]` |
| Muted text | `text-gray-400` | `dark:text-[#92a4c9]` |

#### Borders
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Default border | `border-gray-200` | `dark:border-[#232f48]` |
| Subtle border | `border-gray-100` | `dark:border-[#2a3649]` |

#### Accent Colors
| Status | Color | Usage |
|--------|-------|-------|
| Primary | `#2b6cee` | Buttons, links, active states |
| Success | `emerald-500` | Approved, published, success |
| Warning | `yellow-500` | Pending, scheduled |
| Error | `red-500` | Rejected, failed, errors |
| Info | `blue-500` | Information, processing |
| Purple | `purple-500` | Published status |

### 3. Typography

```tsx
// Page titles
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">

// Section headings
<h2 className="text-lg font-semibold text-gray-900 dark:text-white">

// Card titles
<h3 className="text-base font-medium text-gray-900 dark:text-white">

// Body text
<p className="text-sm text-gray-600 dark:text-gray-300">

// Small/caption text
<span className="text-xs text-gray-500 dark:text-[#92a4c9]">
```

---

## Layout Standards

### 1. Navigation
- Standard navbar MUST be visible on all pages except `/auth/signin`
- Navbar height: `4rem` (64px)
- Main content should account for navbar: `min-h-[calc(100vh-4rem)]`

### 2. Page Structure
```tsx
// Standard page wrapper
<main className="min-h-screen bg-gray-50 dark:bg-[#101622]">
  <div className="container mx-auto px-4 py-8">
    {/* Page content */}
  </div>
</main>
```

### 3. Responsive Breakpoints
- Mobile: Default (< 640px)
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

---

## Component Standards

### 1. Cards
```tsx
<div className="rounded-xl border border-gray-200 dark:border-[#232f48] bg-white dark:bg-[#1a2332] p-6 shadow-sm">
```

### 2. Buttons

#### Primary Button
```tsx
<button className="bg-[#2b6cee] hover:bg-[#2b6cee]/90 text-white font-medium px-4 py-2 rounded-lg">
```

#### Secondary Button
```tsx
<button className="bg-gray-100 dark:bg-[#232f48] hover:bg-gray-200 dark:hover:bg-[#2a3649] text-gray-900 dark:text-white font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-[#232f48]">
```

#### Destructive Button
```tsx
<button className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg">
```

### 3. Form Inputs
```tsx
<input className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#232f48] bg-white dark:bg-[#1a2332] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#92a4c9] focus:ring-2 focus:ring-[#2b6cee] focus:border-transparent" />
```

### 4. Status Badges
```tsx
// Pending
<span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-medium">

// Approved
<span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium">

// Rejected
<span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-medium">

// Published
<span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-medium">

// Scheduled
<span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-medium">
```

### 5. Image Handling
All images MUST use the `MediaThumbnail` component or include error handling:

```tsx
import { MediaThumbnail } from '@/app/components/ui/media-thumbnail';

// Using MediaThumbnail (preferred)
<MediaThumbnail src={imageUrl} aspectRatio="story" />

// Or manual error handling
const [error, setError] = useState(false);
{!error ? (
  <img src={url} onError={() => setError(true)} />
) : (
  <div className="flex items-center justify-center bg-gray-100 dark:bg-[#1a2332]">
    <ImageOff className="text-gray-400" />
  </div>
)}
```

---

## Accessibility Standards

1. All interactive elements must have `focus:ring-2 focus:ring-[#2b6cee]`
2. Color contrast must meet WCAG AA (4.5:1 for text)
3. All images must have `alt` text
4. Buttons must have descriptive labels or `aria-label`
5. Form inputs must have associated labels

---

## Animation Standards

```tsx
// Transitions
className="transition-colors duration-200"
className="transition-all duration-300"

// Hover transforms
className="hover:scale-105 transition-transform"

// Loading states
className="animate-pulse"
className="animate-spin"
```

---

## Checklist for Each Page

- [ ] Supports light mode
- [ ] Supports dark mode
- [ ] Uses correct background colors
- [ ] Uses correct text colors
- [ ] Uses correct border colors
- [ ] Primary accent is blue (#2b6cee)
- [ ] Navbar visible (except signin)
- [ ] Images have error handling
- [ ] Interactive elements have focus states
- [ ] Responsive on all breakpoints
