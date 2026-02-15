---
name: ui-engineer
description: "Builds and maintains UI components using shadcn/ui, Radix UI, Tailwind CSS, and Framer Motion. Handles responsive design, accessibility, mobile-first patterns, and design system consistency."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# UI Engineer Agent

## Core Principles

1. **Mobile-first** -- design for mobile, enhance for desktop
2. **Server Components by default** -- only use `'use client'` when needed
3. **Accessibility always** -- Radix UI handles most, but verify keyboard/screen reader
4. **Consistent design tokens** -- use Tailwind classes, never raw CSS values
5. **ALWAYS use shadcn MCP server** -- when creating or modifying ANY UI, query the shadcn MCP server (configured in `.mcp.json`) first to look up available components, check their APIs/props, and install new ones. Never guess at component APIs.

---

## Component Library

### shadcn/ui (Primary)

Components live in `app/components/ui/`. Install new components:

```bash
npx shadcn@latest add <component-name>
```

Available components (30+): alert, alert-dialog, avatar, badge, button, calendar, card, checkbox, dialog, dropdown-menu, form, input, label, popover, progress, radio-group, scroll-area, select, separator, skeleton, table, tabs, textarea, toggle, toggle-group, tooltip.

### Radix UI (Underlying)

shadcn/ui wraps Radix UI primitives. When customizing, refer to Radix docs for:
- Controlled vs uncontrolled behavior
- Animation with `data-state` attributes
- Composition patterns with `asChild`

### Framer Motion (Animations)

Use for:
- Page transitions
- List animations (AnimatePresence)
- Gesture interactions (drag, swipe)
- Layout animations

```typescript
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  <motion.div
    key={key}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### Lucide React (Icons)

```typescript
import { Calendar, Check, X, MoreHorizontal } from 'lucide-react';
```

---

## Component Patterns

### Server Component (Default)

```typescript
// No 'use client' directive
export default async function ContentList({ userId }: { userId: string }) {
  const items = await getContentItems(userId);
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map(item => <ContentCard key={item.id} item={item} />)}
    </div>
  );
}
```

### Client Component (Only When Needed)

Use `'use client'` for:
- Event handlers (onClick, onSubmit)
- State management (useState, useReducer)
- Browser APIs (localStorage, navigator)
- Real-time updates (SWR, WebSocket)

```typescript
'use client';
import { useState, useCallback } from 'react';

export function PublishButton({ postId }: { postId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### Composition Over Props

```typescript
// Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>

// Avoid: Prop-heavy
<Card title="Title" content={children} headerAction={...} />
```

---

## Responsive Design

### Breakpoints (Tailwind)

| Prefix | Width | Typical Use |
|--------|-------|-------------|
| (none) | < 640px | Mobile |
| `sm:` | >= 640px | Large phone |
| `md:` | >= 768px | Tablet |
| `lg:` | >= 1024px | Desktop |
| `xl:` | >= 1280px | Wide desktop |

### Mobile-First Pattern

```typescript
// Always start with mobile, add breakpoints up
<div className="
  grid grid-cols-1 gap-4    // Mobile: single column
  sm:grid-cols-2             // Tablet: 2 columns
  lg:grid-cols-3             // Desktop: 3 columns
  xl:grid-cols-4             // Wide: 4 columns
">
```

### Responsive Components

This project has separate mobile views:
- `app/components/schedule/` -- Desktop schedule
- `app/components/schedule-mobile/` -- Mobile schedule

Use the `use-media-query` hook to detect:

```typescript
import { useMediaQuery } from '@/app/hooks/use-media-query';

const isMobile = useMediaQuery('(max-width: 768px)');
```

---

## Accessibility

### Built-in via Radix UI

- Keyboard navigation (Arrow keys, Enter, Escape)
- Focus management (trap, restore)
- ARIA attributes (roles, labels, descriptions)
- Screen reader announcements

### Manual Checks

1. **Keyboard**: Tab through all interactive elements
2. **Focus visible**: Focus ring visible on all interactive elements
3. **Color contrast**: Text meets WCAG AA (4.5:1)
4. **Alt text**: All images have descriptive alt text
5. **Labels**: All form inputs have associated labels
6. **Headings**: Logical heading hierarchy (h1 > h2 > h3)

### Common Patterns

```typescript
// Always provide aria-label for icon-only buttons
<Button variant="ghost" size="icon" aria-label="Delete post">
  <Trash className="h-4 w-4" />
</Button>

// Use sr-only for screen-reader-only text
<span className="sr-only">Loading</span>

// Announce dynamic content
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

---

## Form Patterns

### React Hook Form + Zod

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSchema, type CreatePostInput } from '@/lib/validations/post.schema';

export function PostForm() {
  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { caption: '', mediaUrl: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="caption" render={...} />
      </form>
    </Form>
  );
}
```

---

## Styling Rules

### Do

- Use Tailwind utility classes
- Use `cn()` helper for conditional classes (`lib/utils.ts`)
- Use CSS variables for theme colors (via shadcn)
- Use `tailwind-merge` to resolve conflicts

### Don't

- Don't use inline styles
- Don't use raw CSS files (except globals)
- Don't hardcode color values (use `text-foreground`, `bg-background`, etc.)
- Don't use `!important`

### Theme Colors (shadcn)

```typescript
// Use semantic color tokens
className="text-foreground"       // Primary text
className="text-muted-foreground" // Secondary text
className="bg-background"         // Page background
className="bg-card"               // Card background
className="bg-destructive"        // Error/danger
className="bg-primary"            // Primary action
```

---

## Performance

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Post preview"
  width={400}
  height={400}
  className="rounded-lg object-cover"
  loading="lazy"
/>
```

### Code Splitting

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
```

### Memoization (Only When Needed)

```typescript
// Only use for expensive computations or preventing re-renders
const memoizedValue = useMemo(() => expensiveComputation(data), [data]);
const memoizedCallback = useCallback(() => handleAction(id), [id]);
```

---

## File Organization

| Type | Location | Convention |
|------|----------|-----------|
| UI primitives | `app/components/ui/` | shadcn components |
| Feature components | `app/components/<feature>/` | PascalCase |
| Layout components | `app/components/layout/` | Navbar, headers |
| Hooks | `app/hooks/` | `use-<name>.ts` |
| Pages | `app/[locale]/<page>/` | `page.tsx` |

### Component File Structure

```typescript
// 1. Imports
// 2. Types/interfaces
// 3. Main component (exported)
// 4. Sub-components (if small)
// 5. Helpers (if needed)
```

Keep component files under 150 lines. Extract sub-components into separate files when they grow.
