# Swipe Gesture Architecture

## Component Hierarchy

```
TimelineLayout
├── useSwipeManager() hook
│   └── State: openCardId
│
└── TimelineGroup (for each group)
    └── TimelineGrid
        └── TimelineCardSwipeable (for each post)
            ├── useGesture() hook
            │   └── Drag handler
            ├── useMotionValue() + useSpring()
            │   └── Animated position
            ├── Action Buttons Container
            │   ├── Edit Button (blue)
            │   ├── Reschedule Button (amber)
            │   └── Cancel Button (red)
            └── motion.div wrapper
                └── TimelineCard (base component)
```

## Data Flow

### Opening a Card

```
User swipes left
    ↓
useGesture detects drag
    ↓
movement[0] (x-axis) < -50px
    ↓
x.set(-160) // translateX(-160px)
    ↓
onOpenChange(true)
    ↓
toggleCard(postId, true)
    ↓
setOpenCardId(postId)
    ↓
Other cards close automatically
```

### Closing a Card

```
User swipes right OR clicks outside
    ↓
x.set(0)
    ↓
onOpenChange(false)
    ↓
toggleCard(postId, false)
    ↓
setOpenCardId(null)
```

## State Management

```typescript
// useSwipeManager Hook
{
  openCardId: string | null,     // Currently open card
  openCard: (id) => void,        // Open specific card
  closeCard: () => void,          // Close any open card
  toggleCard: (id, open) => void, // Toggle specific card
  isCardOpen: (id) => boolean,    // Check if card is open
}

// Component Level
{
  x: MotionValue<number>,         // Current X position
  springX: SpringValue<number>,   // Animated X position
  hasFiredHaptic: boolean,        // Haptic feedback state
}
```

## Animation Timeline

```
Position: 0px
    ↓
[User starts swiping]
    ↓
Position: -10px, -20px, -30px... (live tracking)
    ↓
[Threshold reached: -50px]
    ↓
Haptic: navigator.vibrate(50)
    ↓
[User releases]
    ↓
Spring animation starts
    ↓
Position: -160px (250ms ease-out)
    ↓
[User taps action button]
    ↓
Callback fires: onEdit/onReschedule/onCancel
    ↓
Spring animation back
    ↓
Position: 0px (250ms ease-out)
```

## Touch Event Flow

```
TouchStart
    ↓
Initial X: 200px
    ↓
TouchMove
    ↓
Current X: 150px
    ↓
Delta: -50px
    ↓
[Check threshold]
    ↓
> 50px? → Set x to -160px
< 50px? → Set x to 0px
    ↓
TouchEnd
    ↓
Spring snap to final position
```

## Render Optimization

```
Initial Render
    ↓
useMotionValue(0) // No re-render on change
    ↓
useSpring(x, config) // GPU-accelerated transform
    ↓
Gesture binding // Event handlers only
    ↓
Transform applied via inline style
    ↓
No React state updates during drag
    ↓
Only re-renders on prop changes
```

## Mobile vs Desktop Detection

```
Component Mount
    ↓
Check: window.innerWidth < 768?
    ↓
YES (Mobile)
    ↓
Render: <TimelineCardSwipeable>
    ├── Gesture handlers
    ├── Action buttons
    └── Animated wrapper
    ↓
NO (Desktop)
    ↓
Render: <TimelineCard>
    └── Regular card (no overhead)
```

## Single Card Enforcement

```
Card A open (openCardId = "A")
    ↓
User swipes Card B
    ↓
toggleCard("B", true)
    ↓
setOpenCardId("B")
    ↓
isCardOpen("A") → false
    ↓
Card A receives isOpen=false
    ↓
Card A animates to x=0
    ↓
Card B receives isOpen=true
    ↓
Card B animates to x=-160
```

## Action Button Click Flow

```
User taps "Edit" button
    ↓
onClick handler
    ↓
e.stopPropagation() // Prevent card click
    ↓
onEdit?.(post) // Call parent callback
    ↓
x.set(0) // Close card
    ↓
onOpenChange?.(false) // Update state
    ↓
Spring animation to x=0
```

## Error Handling

```
Gesture Detection
    ↓
Try: Detect drag
    ↓
Catch: Browser doesn't support touch?
    ↓
Fallback: Regular click handlers
    ↓
Desktop mode: Skip swipe wrapper
```

## Performance Considerations

### GPU Acceleration
- `transform: translateX()` instead of `left` or `margin`
- Triggers compositing layer
- 60fps on most devices

### State Optimization
- `useMotionValue` doesn't trigger re-renders
- Gesture state outside React
- Spring config calculated once

### Touch Handling
- `touch-pan-y` allows vertical scroll
- `filterTaps: true` distinguishes swipes from taps
- `threshold: 5` prevents accidental triggers

## Accessibility Flow

```
Keyboard User
    ↓
Tab to card
    ↓
Focus visible
    ↓
Enter to open
    ↓
Tab to action buttons
    ↓
Enter to activate
    ↓
Action callback fires

Screen Reader User
    ↓
Navigate to card
    ↓
Announce: "Card: [caption]"
    ↓
Announce: "Swipe left for actions"
    ↓
[User swipes]
    ↓
Announce: "Edit button"
    ↓
Tap button
    ↓
Announce: "Edit action"
```

## Integration Points

### Timeline Layout Integration
```typescript
// timeline-layout.tsx
<TimelineCardSwipeable
  post={post}
  onClick={onPostClick}
  onEdit={onEdit}           // → Parent handler
  onReschedule={onReschedule} // → Parent handler
  onCancel={onCancel}       // → Parent handler
  isOpen={isCardOpen(post.id)} // ← Hook state
  onOpenChange={toggleCard} // → Hook updater
/>
```

### Action Handler Example
```typescript
const handleEdit = async (post: TimelineCardPost) => {
  // 1. Close swipe card
  // 2. Open edit modal
  // 3. Wait for save
  // 4. Refresh timeline
};

const handleReschedule = async (post: TimelineCardPost) => {
  // 1. Close swipe card
  // 2. Open date picker
  // 3. Update schedule
  // 4. Refresh timeline
};

const handleCancel = async (post: TimelineCardPost) => {
  // 1. Close swipe card
  // 2. Show confirmation
  // 3. Delete post
  // 4. Remove from list
};
```

## Testing Strategy

### Unit Tests
```
Component Tests
├── Renders on mobile
├── Renders action buttons
├── Renders only provided buttons
├── Falls back on desktop
├── Calls onClick handler
└── Renders different statuses

Hook Tests
├── Initializes correctly
├── Opens card
├── Closes card
├── Toggles card
├── Single card enforcement
└── Toggle edge cases
```

### E2E Tests (Future)
```
Mobile Emulation
├── Swipe left to reveal
├── Tap action button
├── Swipe right to close
├── Click outside to close
├── Multiple cards behavior
└── Haptic feedback (manual)
```

## Dependencies

```
@use-gesture/react ^10.3.1
├── Touch event handling
├── Drag detection
├── Velocity calculation
└── Gesture recognition

framer-motion ^12.31.1
├── useMotionValue
├── useSpring
├── motion components
└── Transform optimization
```

## File Structure

```
app/components/schedule-mobile/
├── timeline-card-swipeable.tsx   [Main component]
├── timeline-layout.tsx            [Integration]
├── swipe-demo.tsx                 [Demo page]
└── index.ts                       [Exports]

app/hooks/
└── use-swipe-manager.ts           [State hook]

__tests__/
├── components/schedule-mobile/
│   └── timeline-card-swipeable.test.tsx
└── hooks/
    └── use-swipe-manager.test.ts
```

## Configuration Constants

```typescript
// Thresholds
SWIPE_THRESHOLD = 50      // px to trigger open
BUTTONS_WIDTH = 160       // total reveal width

// Timing
SNAP_DURATION = 0.25      // animation seconds
HAPTIC_DURATION = 50      // vibration ms

// Spring Physics
stiffness: 300            // snap speed
damping: 30               // bounce control

// Gesture Detection
axis: 'x'                 // horizontal only
filterTaps: true          // distinguish swipes
threshold: 5              // min movement px
```

## Future Architecture Considerations

### Customizable Actions
```typescript
interface SwipeAction {
  id: string;
  label: string;
  icon: React.ComponentType;
  color: string;
  handler: (post) => void;
}

<TimelineCardSwipeable
  actions={[editAction, rescheduleAction, cancelAction]}
/>
```

### Swipe Direction Support
```typescript
<TimelineCardSwipeable
  leftActions={[edit, reschedule]}
  rightActions={[archive, delete]}
/>
```

### Batch Operations
```typescript
<TimelineCardSwipeable
  selectable={true}
  onSelect={(post) => addToSelection(post)}
/>
```
