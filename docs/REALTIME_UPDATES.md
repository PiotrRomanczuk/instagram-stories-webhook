# Real-Time Updates System

## Overview

The real-time updates system provides live synchronization of scheduled posts using Supabase Realtime WebSocket connections. When content changes in the database (INSERT, UPDATE, DELETE), all connected clients receive instant notifications and automatically update their UI.

## Architecture

### Components

1. **`use-realtime-content` Hook** (`app/hooks/use-realtime-content.ts`)
   - Manages Supabase Realtime channel subscription
   - Debounces rapid updates to prevent UI thrashing
   - Provides connection status monitoring
   - Auto-reconnects on connection loss

2. **`ConnectionStatus` Component** (`app/components/schedule-mobile/connection-status.tsx`)
   - Visual indicator of WebSocket connection state
   - Three states: Connected (green), Connecting (yellow pulsing), Disconnected (red)
   - Tooltip with detailed status information
   - Mobile-responsive design

3. **Timeline Page Integration** (`app/components/schedule-mobile/timeline-page.tsx`)
   - Integrates real-time updates with SWR data fetching
   - Toast notifications for different event types
   - Smooth animations for content changes
   - Automatic revalidation on updates

## Usage

### Basic Setup

```typescript
import { useRealtimeContent } from '@/app/hooks/use-realtime-content';
import { toast } from 'sonner';
import useSWR from 'swr';

function MyComponent() {
  const { data, mutate } = useSWR('/api/content', fetcher);

  useRealtimeContent({
    onUpdate: () => {
      mutate(); // Revalidate SWR cache
    },
    onEvent: (event) => {
      if (event.eventType === 'INSERT') {
        toast.success('New post added');
      }
    }
  });

  return <div>{/* Your UI */}</div>;
}
```

### Configuration Options

```typescript
interface UseRealtimeContentOptions {
  /**
   * Called when any content change occurs
   * Triggers SWR revalidation
   */
  onUpdate: () => void;

  /**
   * Called for specific event types with full details
   * Use for toast notifications and animations
   */
  onEvent?: (event: RealtimeContentEvent) => void;

  /**
   * Only listen to content items with scheduled_time
   * Default: true (only scheduled posts)
   */
  scheduledOnly?: boolean;

  /**
   * Debounce multiple rapid updates (in ms)
   * Default: 500ms
   */
  debounceMs?: number;
}
```

### Event Types

```typescript
type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

interface RealtimeContentEvent {
  eventType: RealtimeEventType;
  new?: ContentItemRow;  // New data (INSERT/UPDATE)
  old?: ContentItemRow;  // Old data (UPDATE/DELETE)
  timestamp: number;
}
```

## Event Handling Examples

### INSERT Events

```typescript
onEvent: (event) => {
  if (event.eventType === 'INSERT' && event.new) {
    const timeStr = formatDistanceToNow(
      event.new.scheduled_time,
      { addSuffix: true }
    );
    toast.success(`New post scheduled ${timeStr}`);
  }
}
```

### UPDATE Events

```typescript
onEvent: (event) => {
  if (event.eventType === 'UPDATE' && event.new && event.old) {
    // Status changes
    if (event.new.publishing_status !== event.old.publishing_status) {
      if (event.new.publishing_status === 'published') {
        toast.success('Post published successfully');
      } else if (event.new.publishing_status === 'failed') {
        toast.error('Post publishing failed', {
          description: event.new.error || 'Unknown error'
        });
      }
    }

    // Reschedule notifications
    if (event.new.scheduled_time !== event.old.scheduled_time) {
      const timeStr = formatDistanceToNow(
        event.new.scheduled_time,
        { addSuffix: true }
      );
      toast.info(`Post rescheduled to ${timeStr}`);
    }
  }
}
```

### DELETE Events

```typescript
onEvent: (event) => {
  if (event.eventType === 'DELETE' && event.old) {
    toast.info('Post cancelled');
  }
}
```

## Connection Status

### Monitoring Connection State

```typescript
const { isConnected } = useRealtimeContent({
  onUpdate: () => mutate()
});

// Use in UI
<ConnectionStatus isConnected={isConnected} />
```

### Connection States

| State | Color | Description |
|-------|-------|-------------|
| `connected` | Green | WebSocket connected, receiving updates |
| `connecting` | Yellow (pulsing) | Establishing connection |
| `disconnected` | Red | Connection lost, auto-reconnecting |

### Auto-Reconnection

The hook automatically attempts to reconnect on connection loss:

- Waits 5 seconds after connection error
- Logs reconnection attempts to console
- No manual intervention required
- Maintains subscription state across reconnects

## Animations

### Framer Motion Integration

```typescript
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="popLayout">
  {posts.map((post) => (
    <motion.div
      key={post.id}
      layout
      initial={{ opacity: 0, scale: 0.9, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
        layout: { duration: 0.2 }
      }}
    >
      <PostCard post={post} />
    </motion.div>
  ))}
</AnimatePresence>
```

### Animation Benefits

- **Insert**: New posts slide in from top with fade
- **Update**: Smooth layout shifts as content changes
- **Delete**: Posts fade out and slide down before removal
- **Reordering**: Automatic layout animations when posts move

## Performance Optimization

### Debouncing

The hook debounces rapid updates to prevent UI thrashing:

```typescript
useRealtimeContent({
  onUpdate: () => mutate(),
  debounceMs: 500 // Wait 500ms before triggering update
});
```

**Benefits:**
- Multiple rapid changes trigger only one revalidation
- Reduces server load and bandwidth usage
- Prevents UI flickering

### Optimistic Updates

Combine with SWR's optimistic updates for instant feedback:

```typescript
const { mutate } = useSWR('/api/content');

// Optimistic update
mutate(
  async (currentData) => {
    const updated = await updatePost(postId, changes);
    return { ...currentData, items: [...updated] };
  },
  {
    optimisticData: (currentData) => ({
      ...currentData,
      items: currentData.items.map(item =>
        item.id === postId ? { ...item, ...changes } : item
      )
    }),
    rollbackOnError: true,
    revalidate: false // Real-time updates will revalidate
  }
);
```

## Database Requirements

### Supabase Realtime Setup

1. **Enable Realtime** for the `content` table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE content;
   ```

2. **Row Level Security** (RLS):
   - Ensure RLS policies allow users to SELECT their own content
   - Real-time updates respect RLS policies automatically

3. **Column-Level Filtering** (optional):
   ```sql
   -- Only replicate specific columns
   ALTER PUBLICATION supabase_realtime
   DROP TABLE content;

   ALTER PUBLICATION supabase_realtime
   ADD TABLE content (id, publishing_status, scheduled_time, updated_at);
   ```

## Debugging

### Enable Debug Logging

Check browser console for real-time events:

```
[Realtime] Setting up Supabase Realtime subscription...
[Realtime] Connected to content changes
[Realtime] Content changed: {
  eventType: 'UPDATE',
  table: 'content',
  newData: { ... }
}
```

### Common Issues

#### Connection Not Established

**Symptoms:** Yellow dot persists, no updates received

**Solutions:**
1. Check Supabase project settings → Realtime → Enabled
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Check browser console for errors
4. Verify Row Level Security policies allow SELECT

#### Updates Not Triggering

**Symptoms:** Connection green, but no toast notifications

**Solutions:**
1. Ensure `onUpdate` callback calls `mutate()`
2. Check `scheduledOnly` filter matches your data
3. Verify database changes include `scheduled_time` (if `scheduledOnly: true`)
4. Check browser console for event logs

#### Performance Issues

**Symptoms:** UI lagging, high CPU usage

**Solutions:**
1. Increase `debounceMs` to 1000ms or higher
2. Use `scheduledOnly: true` to reduce event volume
3. Optimize `onEvent` callback (avoid heavy computations)
4. Consider pagination for large datasets

## Testing

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react';
import { useRealtimeContent } from '@/app/hooks/use-realtime-content';

it('should call onUpdate when content changes', () => {
  const mockOnUpdate = vi.fn();

  renderHook(() =>
    useRealtimeContent({
      onUpdate: mockOnUpdate
    })
  );

  // Trigger mock event
  // ...

  expect(mockOnUpdate).toHaveBeenCalled();
});
```

### E2E Tests

Mock Supabase Realtime for predictable testing:

```typescript
vi.mock('@/lib/config/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn()
    }))
  }
}));
```

## Best Practices

### 1. Always Debounce

```typescript
// Good
useRealtimeContent({
  onUpdate: () => mutate(),
  debounceMs: 500
});

// Bad - can cause UI thrashing
useRealtimeContent({
  onUpdate: () => mutate(),
  debounceMs: 0
});
```

### 2. Handle All Event Types

```typescript
// Good
onEvent: (event) => {
  switch (event.eventType) {
    case 'INSERT':
      toast.success('New post');
      break;
    case 'UPDATE':
      toast.info('Post updated');
      break;
    case 'DELETE':
      toast.info('Post deleted');
      break;
  }
}
```

### 3. Show Connection Status

```typescript
// Good - users know if updates are live
<ConnectionStatus isConnected={isConnected} />

// Bad - users don't know if they're receiving updates
```

### 4. Cleanup on Unmount

The hook handles cleanup automatically, but ensure you don't create memory leaks:

```typescript
// Good - hook cleans up automatically
useRealtimeContent({ onUpdate: () => mutate() });

// Bad - manual subscription without cleanup
useEffect(() => {
  const channel = supabase.channel('content-changes');
  channel.subscribe();
  // Missing cleanup!
}, []);
```

## Future Enhancements

### Planned Features

1. **Presence Tracking**
   - Show other users viewing the same timeline
   - Real-time collaboration indicators

2. **Typing Indicators**
   - Show when someone is editing a post
   - Prevent simultaneous edits

3. **Conflict Resolution**
   - Handle optimistic locking failures
   - Merge concurrent changes

4. **Selective Subscriptions**
   - Subscribe to specific post IDs
   - Filter by user or status

5. **Offline Support**
   - Queue changes when offline
   - Sync when connection restored

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [SWR Documentation](https://swr.vercel.app/)
- [Sonner Toast Documentation](https://sonner.emilkowal.ski/)
