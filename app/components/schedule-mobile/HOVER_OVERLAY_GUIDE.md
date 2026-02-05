# Desktop Hover Overlay Implementation Guide

## Overview

The desktop hover overlay provides an elegant, quick-access interface for managing scheduled posts on desktop devices (≥1024px). When users hover over a timeline card, a semi-transparent overlay appears with three action buttons: Edit, Reschedule, and Cancel.

## Architecture

### Components

1. **TimelineCardHoverOverlay** (`timeline-card-hover-overlay.tsx`)
   - Renders the overlay with action buttons
   - Uses framer-motion for smooth animations
   - GPU-accelerated with `will-change: opacity`

2. **TimelineCard** (`timeline-card.tsx`)
   - Integrated hover state management
   - Conditionally shows overlay on desktop only
   - Falls back to mobile action buttons on small screens

### Key Features

- **Desktop Only**: Uses `useMediaQuery('(min-width: 1024px)')` to detect desktop
- **Smooth Animations**: 200ms fade-in/out with framer-motion
- **Accessible**: Full keyboard support with focus rings
- **Performance**: GPU-accelerated animations, no layout shifts
- **State Management**: Integrated with existing modal system

## Implementation Details

### Hover Detection

```typescript
const [isHovered, setIsHovered] = useState(false);
const isDesktop = useMediaQuery('(min-width: 1024px)');

// In JSX:
onMouseEnter={() => isDesktop && setIsHovered(true)}
onMouseLeave={() => isDesktop && setIsHovered(false)}
```

### Conditional Rendering

```typescript
const showHoverOverlay = isDesktop && isHovered && post.publishingStatus === 'scheduled';

// Desktop: Show overlay on hover
{showHoverOverlay && (
  <TimelineCardHoverOverlay ... />
)}

// Mobile: Show action buttons below content
{onUpdate && !isDesktop && (
  <TimelineCardActions item={contentItem} onUpdate={onUpdate} />
)}
```

### Action Handlers

All actions are integrated with existing modals:

1. **Edit**: Opens `ContentEditModal`
2. **Reschedule**: Opens `ContentEditModal` (includes time picker)
3. **Cancel**: Opens `ConfirmationDialog` with delete confirmation

### Styling

- **Overlay Background**: `bg-black/70` (rgba(0, 0, 0, 0.7))
- **Button Size**: 44px × 44px (optimal touch target)
- **Button Colors**:
  - Edit: `#2b6cee` (blue)
  - Reschedule: `#f59e0b` (amber)
  - Cancel: `#ef4444` (red)
- **Transitions**: 200ms ease for all hover effects
- **Z-index**: 10 (ensures overlay appears above content)

### Animation

```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
  style={{ willChange: 'opacity' }}
>
```

## Performance Optimizations

1. **GPU Acceleration**: Uses `will-change: opacity` for hardware acceleration
2. **No Layout Shifts**: Absolute positioning prevents reflow
3. **Conditional Mount**: Overlay only mounts when hovered
4. **Event Optimization**: `stopPropagation()` prevents event bubbling

## Accessibility

- **Keyboard Focus**: All buttons have visible focus rings
- **ARIA Labels**: Each button has descriptive `aria-label`
- **Focus Management**: Focus rings use offset to stand out from dark background
- **Color Contrast**: White icons on colored backgrounds meet WCAG standards

## Testing

### Manual Testing

1. Open demo page on desktop (≥1024px)
2. Hover over a scheduled post card
3. Verify overlay appears with 200ms fade-in
4. Click each button to verify modal opens
5. Move mouse away to verify overlay fades out
6. Resize to mobile (<1024px) and verify overlay doesn't appear
7. Verify mobile action buttons appear instead

### E2E Testing

Test file: `__tests__/e2e/schedule-timeline.spec.ts`

```typescript
test('shows hover overlay on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/schedule/timeline');

  const card = page.locator('[data-testid="timeline-card"]').first();
  await card.hover();

  // Verify overlay appears
  await expect(page.locator('[data-testid="hover-edit-btn"]')).toBeVisible();
  await expect(page.locator('[data-testid="hover-reschedule-btn"]')).toBeVisible();
  await expect(page.locator('[data-testid="hover-cancel-btn"]')).toBeVisible();
});

test('hides hover overlay on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/schedule/timeline');

  const card = page.locator('[data-testid="timeline-card"]').first();
  await card.hover();

  // Verify overlay does NOT appear
  await expect(page.locator('[data-testid="hover-edit-btn"]')).not.toBeVisible();
});
```

## Usage Example

```typescript
import { TimelineCard } from '@/app/components/schedule-mobile';

<TimelineCard
  post={{
    id: '123',
    url: 'https://example.com/image.jpg',
    caption: 'Test post',
    scheduledTime: Date.now() + 3600000,
    publishingStatus: 'scheduled',
    mediaType: 'IMAGE',
  }}
  item={fullContentItem} // Optional: full ContentItem for actions
  onClick={(post) => console.log('Card clicked', post)}
  onUpdate={() => refetchPosts()} // Required for actions
/>
```

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (uses `-webkit-` prefixes automatically)
- **Mobile**: Hover overlay disabled (uses touch actions instead)

## Known Limitations

1. **Touch Devices**: Overlay doesn't appear on touch devices (intentional)
2. **Published Posts**: Overlay only shows for `scheduled` status posts
3. **No Item Prop**: If `item` prop is missing, a minimal ContentItem is created (may lack some fields)

## Future Enhancements

- [ ] Add keyboard shortcuts (e.g., 'e' for edit, 'r' for reschedule)
- [ ] Add haptic feedback on supported devices
- [ ] Add preview modal on hover (optional)
- [ ] Add drag-to-reorder from overlay
- [ ] Add batch selection mode

## Related Files

- `/app/components/schedule-mobile/timeline-card.tsx` - Main card component
- `/app/components/schedule-mobile/timeline-card-hover-overlay.tsx` - Overlay component
- `/app/components/schedule-mobile/timeline-card-actions.tsx` - Mobile action buttons
- `/app/hooks/use-media-query.ts` - Media query hook
- `/app/components/content/content-edit-modal.tsx` - Edit modal
- `/app/components/ui/confirmation-dialog.tsx` - Delete confirmation

## Maintenance

- Keep hover colors in sync with mobile action button colors
- Update button sizes if touch target guidelines change
- Monitor performance with Chrome DevTools Performance tab
- Test on new browser versions for CSS compatibility
