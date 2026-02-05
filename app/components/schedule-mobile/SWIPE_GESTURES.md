# Swipe Gesture System

## Overview

The swipe gesture system allows users on mobile devices to reveal action buttons by swiping left on timeline cards. This provides a native mobile experience similar to iOS Mail or Messages apps.

## Components

### 1. `timeline-card-swipeable.tsx`

The main swipeable wrapper component that adds touch gesture support to timeline cards.

**Features:**
- Swipe-left gesture to reveal action buttons
- Spring animation for smooth snap-back
- Haptic feedback at 50px threshold
- Prevents scroll while swiping
- Auto-closes when clicking outside
- Desktop fallback (no swipe wrapper)

**Props:**
```typescript
interface TimelineCardSwipeableProps {
  post: TimelineCardPost;
  onClick?: (post: TimelineCardPost) => void;
  onEdit?: (post: TimelineCardPost) => void;
  onReschedule?: (post: TimelineCardPost) => void;
  onCancel?: (post: TimelineCardPost) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}
```

**Usage:**
```tsx
<TimelineCardSwipeable
  post={post}
  onClick={handleClick}
  onEdit={handleEdit}
  onReschedule={handleReschedule}
  onCancel={handleCancel}
  isOpen={isCardOpen(post.id)}
  onOpenChange={(isOpen) => toggleCard(post.id, isOpen)}
/>
```

### 2. `use-swipe-manager.ts`

A custom hook for managing swipe state across multiple cards.

**Features:**
- Ensures only one card is open at a time
- Provides state management for card open/close
- Simple API for toggling card states

**API:**
```typescript
const {
  openCardId,      // string | null - Currently open card ID
  openCard,        // (cardId: string) => void
  closeCard,       // () => void
  toggleCard,      // (cardId: string, isOpen: boolean) => void
  isCardOpen,      // (cardId: string) => boolean
} = useSwipeManager();
```

**Usage:**
```tsx
function MyComponent() {
  const { isCardOpen, toggleCard } = useSwipeManager();

  return (
    <div>
      {posts.map((post) => (
        <TimelineCardSwipeable
          key={post.id}
          post={post}
          isOpen={isCardOpen(post.id)}
          onOpenChange={(isOpen) => toggleCard(post.id, isOpen)}
        />
      ))}
    </div>
  );
}
```

### 3. `timeline-layout.tsx` (Enhanced)

Updated to support swipeable cards with new props.

**New Props:**
```typescript
interface TimelineLayoutProps {
  // ... existing props
  onEdit?: (post: TimelineCardPost) => void;
  onReschedule?: (post: TimelineCardPost) => void;
  onCancel?: (post: TimelineCardPost) => void;
  enableSwipe?: boolean; // Default: true
}
```

## Configuration

### Swipe Thresholds

Defined in `timeline-card-swipeable.tsx`:

```typescript
const SWIPE_THRESHOLD = 50;      // px - minimum swipe to reveal buttons
const BUTTONS_WIDTH = 160;       // px - total width of action buttons
const SNAP_DURATION = 0.25;      // seconds
const HAPTIC_DURATION = 50;      // ms
```

### Spring Animation

Using framer-motion's spring configuration:

```typescript
const springX = useSpring(x, {
  stiffness: 300,  // Higher = snappier
  damping: 30,     // Higher = less bouncy
});
```

## Action Buttons

Three action buttons are supported (all optional):

1. **Edit** (Blue) - `onEdit` callback
2. **Reschedule** (Amber) - `onReschedule` callback
3. **Cancel** (Red) - `onCancel` callback

Each button is 50px wide. If all three are provided, total width is 160px (includes padding).

**Button Styling:**
- Icon + Label layout
- Active state feedback
- Accessible labels (aria-label)
- Touch-optimized (full height clickable)

## Mobile Detection

Desktop detection (viewport width >= 768px):
- Returns regular `<TimelineCard />` without swipe wrapper
- No performance overhead for desktop users

```typescript
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

if (!isMobile) {
  return <TimelineCard post={post} onClick={onClick} />;
}
```

## Haptic Feedback

Uses native Vibration API when available:

```typescript
if (
  Math.abs(clampedX) >= SWIPE_THRESHOLD &&
  navigator.vibrate
) {
  navigator.vibrate(HAPTIC_DURATION);
}
```

**Browser Support:**
- iOS: Safari 13.4+
- Android: Chrome 32+
- Desktop: Not supported (gracefully ignored)

## Gesture Handling

Uses `@use-gesture/react` for robust touch handling:

```typescript
const bind = useGesture({
  onDrag: ({ movement: [mx], velocity: [vx], down, cancel }) => {
    // Only allow left swipe (negative movement)
    const clampedX = Math.min(0, Math.max(-BUTTONS_WIDTH, mx));

    if (down) {
      // While dragging
      x.set(clampedX);
    } else {
      // Release - snap to open or closed
      const shouldOpen =
        Math.abs(clampedX) > SWIPE_THRESHOLD || vx < -0.5;

      x.set(shouldOpen ? -BUTTONS_WIDTH : 0);
    }
  }
}, {
  drag: {
    axis: 'x',           // Horizontal only
    filterTaps: true,    // Distinguish swipes from taps
    threshold: 5,        // Minimum movement to start drag
  }
});
```

## Performance

**Optimizations:**
- Uses `transform: translateX()` for GPU acceleration
- Spring animation with `useMotionValue` (no re-renders)
- Gesture state managed outside React state
- Desktop users skip swipe wrapper entirely

**Touch Handling:**
- `touch-pan-y` class prevents conflict with scroll
- Cancels scroll when horizontal movement detected
- Threshold prevents accidental triggers

## Testing

### Unit Tests

**Component Tests:**
```bash
npm run test -- timeline-card-swipeable.test.tsx
```

**Hook Tests:**
```bash
npm run test -- use-swipe-manager.test.ts
```

### E2E Testing (Playwright)

Swipe gestures can be tested with Playwright's mobile emulation:

```typescript
test('swipe to reveal actions on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const card = page.locator('[data-testid="timeline-card-swipeable"]').first();

  // Swipe left
  await card.dispatchEvent('touchstart', {
    touches: [{ clientX: 100, clientY: 100 }]
  });
  await card.dispatchEvent('touchmove', {
    touches: [{ clientX: 50, clientY: 100 }]
  });
  await card.dispatchEvent('touchend');

  // Verify buttons are visible
  await expect(page.locator('[aria-label="Edit post"]')).toBeVisible();
});
```

## Demo Page

A demo page is available at `swipe-demo.tsx`:

```tsx
import { SwipeDemo } from '@/app/components/schedule-mobile';

export default function Page() {
  return <SwipeDemo />;
}
```

**Features:**
- Mock data with various post statuses
- Visual feedback for actions
- Instructions overlay
- Last action display

## Accessibility

**Keyboard Support:**
- Cards remain keyboard-accessible
- Action buttons can be triggered via keyboard
- Focus management preserved

**Screen Readers:**
- Proper aria-labels on action buttons
- Card status announced
- Action results provide feedback

**Touch Targets:**
- Buttons are full height (min 48px recommended)
- 50px width meets WCAG 2.1 Level AA

## Browser Compatibility

**Swipe Gestures:**
- iOS Safari 13+
- Android Chrome 80+
- Modern mobile browsers

**Fallback:**
- Desktop: Regular cards (no swipe)
- Older browsers: Degrades gracefully to tap-based actions

**Required Features:**
- `@use-gesture/react` for touch handling
- `framer-motion` for animations
- CSS `transform` support

## Troubleshooting

### Swipe Not Working

1. Check viewport width (must be < 768px)
2. Verify `enableSwipe` prop is true
3. Ensure callbacks are provided (onEdit, etc.)
4. Check browser console for errors

### Multiple Cards Opening

- Verify `useSwipeManager` hook is used
- Check `isOpen` and `onOpenChange` are connected
- Ensure unique `post.id` values

### Scroll Interference

- Verify `touch-pan-y` class is applied
- Check gesture threshold (default: 5px)
- Increase threshold if needed

### Animation Jank

- Check for excessive re-renders
- Verify `useMotionValue` is used (not state)
- Test on physical device (simulators may lag)

## Future Enhancements

Potential improvements:

1. **Customizable Actions**: Allow consumers to pass custom action buttons
2. **Swipe Right**: Support right swipe for different actions
3. **Partial Reveal**: Show button hints on initial swipe
4. **Swipe Feedback**: Visual cues during swipe
5. **Undo Action**: Snackbar with undo for destructive actions
6. **Batch Operations**: Select multiple cards via swipe
7. **Settings**: User preference for swipe sensitivity

## Related Files

- `/app/components/schedule-mobile/timeline-card-swipeable.tsx` - Main component
- `/app/hooks/use-swipe-manager.ts` - State management hook
- `/app/components/schedule-mobile/timeline-layout.tsx` - Integration
- `/app/components/schedule-mobile/swipe-demo.tsx` - Demo page
- `/__tests__/components/schedule-mobile/timeline-card-swipeable.test.tsx` - Tests
- `/__tests__/hooks/use-swipe-manager.test.ts` - Hook tests
