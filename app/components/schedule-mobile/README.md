# Schedule Mobile Components

Interactive features for the mobile-first timeline schedule view with search, filters, and responsive navigation.

## Components

### TimelineHeader

Search bar and filter chips with URL state persistence.

**Features:**
- Debounced search input (500ms delay)
- Filter chips: All | Scheduled | Published | Failed
- Clear filters button
- Dark theme styling
- Responsive layout

**Usage:**
```tsx
import { TimelineHeader } from '@/app/components/schedule-mobile';

<TimelineHeader
  onSearchChange={(query) => console.log('Search:', query)}
  onFilterChange={(filter) => console.log('Filter:', filter)}
  activeFilter="scheduled"
  counts={{
    all: 42,
    scheduled: 15,
    published: 20,
    failed: 3,
  }}
/>
```

### TimelineFilters

Filter chip buttons component.

**Usage:**
```tsx
import { TimelineFilters } from '@/app/components/schedule-mobile';

<TimelineFilters
  activeFilter="scheduled"
  onFilterChange={(filter) => setActiveFilter(filter)}
  counts={{ all: 42, scheduled: 15, published: 20, failed: 3 }}
/>
```

### FilterChip

Reusable filter chip component (pill-shaped).

**Usage:**
```tsx
import { FilterChip } from '@/app/components/schedule-mobile';

<FilterChip
  label="Scheduled"
  active={true}
  onClick={() => {}}
  count={15}
/>
```

### TimelineNavigation

Responsive navigation that adapts to viewport size.

**Mobile (<768px):**
- Bottom navigation bar (fixed, 60px height)
- 5 icons with labels
- Center "Add" button (elevated)

**Desktop (≥768px):**
- Sidebar navigation (240px wide, fixed left)
- Icons + labels as vertical list

**Usage:**
```tsx
import { TimelineNavigation } from '@/app/components/schedule-mobile';

<TimelineNavigation />
```

## Hooks

### useMediaQuery

Detect viewport size changes using media queries.

**Usage:**
```tsx
import { useMediaQuery } from '@/app/hooks/use-media-query';

const isDesktop = useMediaQuery('(min-width: 768px)');
```

### useDebounce

Debounce a value with configurable delay.

**Usage:**
```tsx
import { useDebounce } from '@/app/hooks/use-debounce';

const debouncedQuery = useDebounce(searchQuery, 500);
```

### useUrlState

Manage state in URL search parameters.

**Usage:**
```tsx
import { useUrlState } from '@/app/hooks/use-url-state';

const { getParam, setParam, setParams } = useUrlState();
```

## Testing

All components include data-testid attributes for testing.
