# Timeline Component Architecture

## Component Hierarchy

```
TimelinePage (Full Page Container)
│
├── TimelineHeader (Search + Filters)
│   ├── Search Input (debounced)
│   └── TimelineFilters
│       └── FilterChip × 4 (All, Scheduled, Published, Failed)
│
├── TimelineLayout (Main Content)
│   ├── Pull-to-Refresh Button
│   │
│   ├── TimelineGroup (TODAY)
│   │   ├── Group Header ("TODAY • 3 POSTS")
│   │   └── Grid (1/2/3 columns)
│   │       ├── TimelineCard (Post 1)
│   │       ├── TimelineCard (Post 2)
│   │       └── TimelineCard (Post 3)
│   │
│   ├── TimelineGroup (TOMORROW)
│   │   ├── Group Header ("TOMORROW • 2 POSTS")
│   │   └── Grid
│   │       ├── TimelineCard (Post 4)
│   │       └── TimelineCard (Post 5)
│   │
│   └── TimelineGroup (THIS WEEK)
│       ├── Group Header ("THIS WEEK • 1 POST")
│       └── Grid
│           └── TimelineCard (Post 6)
│
│   OR (if no posts)
│   └── TimelineEmptyState
│       ├── Calendar Icon
│       ├── Heading
│       ├── Subtext
│       └── CTA Button
│
└── TimelineNavigation (Bottom Bar / Sidebar)
    ├── NavItem (Timeline)
    ├── NavItem (Calendar)
    ├── NavItem (Add) ← Center, elevated
    ├── NavItem (Insights)
    └── NavItem (Profile)
```

## Data Flow

```
User Input
    ↓
TimelineHeader
    ├── Search Query → debounce(500ms) → onSearchChange
    └── Filter Click → onFilterChange
         ↓
TimelinePage (manages state)
    ├── Filters posts by status
    ├── Searches posts by caption
    └── Updates URL params
         ↓
TimelineLayout (receives filtered posts)
    ├── Groups posts by time (groupPostsByTime)
    └── Renders TimelineCard for each post
         ↓
TimelineCard
    ├── Displays thumbnail (9:16 ratio)
    ├── Shows time badge
    ├── Shows status stripe (LEFT border)
    └── onClick → Post Details Modal (future)
```

## Responsive Behavior

### Mobile (< 768px)
- 1 column grid
- Bottom navigation bar (fixed)
- 80px wide thumbnails
- Compact spacing

### Tablet (768px - 1024px)
- 2 column grid
- Sidebar navigation
- Larger thumbnails
- More whitespace

### Desktop (> 1024px)
- 3 column grid
- Full sidebar navigation
- Maximum thumbnail size
- Generous spacing

## State Management

### Component State (useState)
- `TimelineCard`: imageError, hover states
- `TimelineLayout`: isRefreshing
- `TimelineHeader`: searchQuery (local)

### URL State (useUrlState)
- `?q=search` - Search query
- `?filter=scheduled` - Active filter
- `?view=timeline` - Current view

### Server State (SWR/React Query)
- Scheduled posts list
- Real-time updates
- Optimistic updates

## Event Handlers

### TimelineLayout
```typescript
onPostClick?: (post: TimelineCardPost) => void
onScheduleClick?: () => void
onRefresh?: () => Promise<void>
```

### TimelineHeader
```typescript
onSearchChange: (query: string) => void
onFilterChange: (filter: FilterType) => void
```

### TimelineNavigation
```typescript
onNavigate?: (path: string) => void
```

## Styling System

### Color Palette
- Background: `#101622` (dark navy)
- Card: `#1a1f2e` (lighter navy)
- Primary: `#2b6cee` (blue)
- Text: `#ffffff` (white), `#94a3b8` (slate-400)

### Status Colors
- Scheduled: `#3b82f6` (blue-500)
- Published: `#10b981` (emerald-500)
- Failed: `#ef4444` (red-500)
- Processing: `#f59e0b` (amber-500)

### Shadows
- Card: `shadow-lg` → `shadow-xl` (hover)
- Button: `shadow-lg` with color tint

### Transitions
- Duration: `300ms` (standard)
- Easing: Tailwind defaults
- Transforms: `scale`, `translateY`

## Accessibility

### Semantic HTML
- `<main>` for layout
- `<article>` for cards
- `<button>` for actions
- `<nav>` for navigation

### ARIA Attributes
- `aria-label` on icon buttons
- `aria-current` on active nav items
- `role="status"` on loading states

### Keyboard Navigation
- Tab order: Header → Cards → Navigation
- Enter/Space: Activate buttons
- Escape: Close modals (future)

## Performance Optimizations

### Image Loading
- `unoptimized` prop for external URLs
- Error fallback UI
- Lazy loading (native)

### Re-render Optimization
- `useMemo` for grouped posts
- `useCallback` for event handlers
- Component-level memoization (future)

### Code Splitting
- Dynamic imports for modals
- Lazy load navigation components
- Split vendor chunks

## Testing Strategy

### Unit Tests (Vitest)
- `groupPostsByTime` utility
- Status color mapping
- Time formatting

### E2E Tests (Playwright)
- Card rendering
- Filter interactions
- Search functionality
- Responsive behavior
- Empty state

### Visual Regression
- Screenshot tests for each viewport
- Theme consistency
- Animation states

## Integration Points

### API Endpoints
- `GET /api/schedule/list` - Fetch posts
- `POST /api/schedule/create` - Create post
- `PATCH /api/schedule/:id` - Update post
- `DELETE /api/schedule/:id` - Delete post

### Real-time Updates
- Supabase subscriptions on `scheduled_posts` table
- Optimistic UI updates
- Conflict resolution

### Analytics
- Track card clicks
- Track filter usage
- Track search queries
- Time spent per view
