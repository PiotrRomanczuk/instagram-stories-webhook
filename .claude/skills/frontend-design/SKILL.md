---
name: frontend-design
description: Frontend UI/UX design guidance for creating distinctive, production-grade interfaces. Use when designing new components, improving existing UI, or ensuring consistent design patterns across the Guitar CRM application. Focuses on mobile-first design, Tailwind CSS, shadcn/ui, and Framer Motion animations.
---

# Frontend Design Guide

## Overview

Create distinctive, production-grade frontend interfaces for Guitar CRM using Tailwind CSS 4, shadcn/ui components, and Framer Motion for smooth animations. **All components MUST be mobile-friendly first.**

## Core Principles

### 1. Mobile-First is MANDATORY

Every component must work perfectly on mobile devices:
- **Design for iPhone SE (375px) first**, then scale up to iPhone 17 Pro Max (430px) and desktop
- **Touch targets minimum 44x44px** for all interactive elements
- **No horizontal scrolling** on mobile viewports
- **Thumb-friendly navigation** - important actions at bottom of screen
- **Test on real devices** - not just browser dev tools

### Target Devices

| Device | Width | Height | Use Case |
|--------|-------|--------|----------|
| **iPhone SE** | 375px | 667px | Minimum supported size |
| **iPhone 17 Pro Max** | 430px | 932px | Large phone reference |
| **iPad** | 768px | 1024px | Tablet breakpoint |
| **Desktop** | 1280px+ | - | Full experience |

### 2. Consistency Over Creativity

For a CRM application, prioritize:
- **Predictable layouts** - Users should know where to find things
- **Clear hierarchy** - Important actions stand out
- **Accessible colors** - WCAG 2.1 AA compliance
- **Responsive design** - Mobile-first approach

---

## Mobile-First Design Rules

### Breakpoint Strategy

```tsx
// ALWAYS start with mobile styles (iPhone SE 375px), then add larger breakpoints
//
// Device mapping to Tailwind breakpoints:
// - Base (no prefix): iPhone SE (375px) - ALWAYS START HERE
// - sm: (640px): Large phones / iPhone 17 Pro Max landscape
// - md: (768px): iPad portrait
// - lg: (1024px): iPad landscape / small laptops
// - xl: (1280px): Desktop

// ✅ CORRECT - Mobile first (iPhone SE → iPhone 17 Pro Max → Desktop)
className="flex flex-col md:flex-row"
className="w-full md:w-1/2 lg:w-1/3"
className="text-sm md:text-base"
className="p-4 md:p-6 lg:p-8"
className="gap-3 sm:gap-4 md:gap-6"

// ❌ WRONG - Desktop first
className="flex-row md:flex-col"  // Don't do this
```

### Mobile Layout Patterns

```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <h1 className="text-xl font-bold">Title</h1>
  <div className="flex gap-2">
    <Button size="sm" className="flex-1 md:flex-none">Action 1</Button>
    <Button size="sm" className="flex-1 md:flex-none">Action 2</Button>
  </div>
</div>

// Full-width buttons on mobile
<Button className="w-full sm:w-auto">Submit</Button>

// Bottom-fixed action bar on mobile
<div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:relative md:border-0 md:p-0">
  <Button className="w-full md:w-auto">Save Changes</Button>
</div>
```

### Touch-Friendly Components

```tsx
// Minimum touch target size (44x44px)
<Button size="lg" className="min-h-[44px] min-w-[44px]">
  <Icon className="h-5 w-5" />
</Button>

// Increased tap areas for list items
<div className="p-4 -m-2 cursor-pointer active:bg-muted/50">
  {/* Content */}
</div>

// Swipeable cards (consider react-swipeable)
<div className="touch-pan-x overflow-x-auto snap-x snap-mandatory">
  {items.map(item => (
    <div key={item.id} className="snap-center min-w-[280px]">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Mobile Navigation

```tsx
// Bottom navigation for mobile
<nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
  <div className="flex justify-around py-2">
    <NavItem icon={Home} label="Home" href="/dashboard" />
    <NavItem icon={Music} label="Songs" href="/dashboard/songs" />
    <NavItem icon={Calendar} label="Lessons" href="/dashboard/lessons" />
    <NavItem icon={User} label="Profile" href="/dashboard/profile" />
  </div>
</nav>

// Add bottom padding to main content to account for fixed nav
<main className="pb-20 md:pb-0">
  {/* Page content */}
</main>
```

---

## Framer Motion Animations

### Installation

```bash
npm install framer-motion
```

### Basic Setup

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
```

### Page Transitions

```tsx
// Wrap pages with motion for smooth transitions
export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

### List Animations (Staggered)

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Usage
<motion.ul
  variants={containerVariants}
  initial="hidden"
  animate="visible"
  className="space-y-3"
>
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      <Card>{/* Content */}</Card>
    </motion.li>
  ))}
</motion.ul>
```

### Card Hover Effects

```tsx
<motion.div
  whileHover={{ scale: 1.02, y: -4 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
>
  <Card className="cursor-pointer">
    {/* Card content */}
  </Card>
</motion.div>
```

### Button Interactions

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
>
  Click Me
</motion.button>
```

### Modal/Dialog Animations

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-4 top-[20%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-background rounded-xl p-6 z-50"
      >
        {/* Modal content */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### Skeleton Loading with Pulse

```tsx
<motion.div
  animate={{ opacity: [0.5, 1, 0.5] }}
  transition={{ duration: 1.5, repeat: Infinity }}
  className="h-4 bg-muted rounded"
/>
```

### Accordion/Collapse Animation

```tsx
<motion.div
  initial={false}
  animate={{ height: isOpen ? 'auto' : 0 }}
  transition={{ duration: 0.3, ease: 'easeInOut' }}
  className="overflow-hidden"
>
  <div className="p-4">
    {/* Collapsible content */}
  </div>
</motion.div>
```

### Toast/Notification Animation

```tsx
<motion.div
  initial={{ opacity: 0, x: 100 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 100 }}
  className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg"
>
  <p>Notification message</p>
</motion.div>
```

### Gesture-Based Interactions (Mobile)

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: -100, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x < -50) {
      onSwipeDelete();
    }
  }}
  className="relative"
>
  <Card>{/* Swipeable card content */}</Card>
  <div className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center">
    <Trash className="h-5 w-5 text-white" />
  </div>
</motion.div>
```

### Reduced Motion Support

```tsx
// Always respect user preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
>
  {/* Content */}
</motion.div>

// Or use the hook
import { useReducedMotion } from 'framer-motion';

function Component() {
  const shouldReduceMotion = useReducedMotion();
  // Adjust animations based on preference
}
```

---

## Color System

### Guitar CRM Palette

```css
/* Primary palette */
--primary: 222.2 47.4% 11.2%;        /* Dark blue - main actions */
--secondary: 210 40% 96%;             /* Light gray - backgrounds */
--accent: 210 40% 96%;                /* Subtle highlights */
--destructive: 0 84.2% 60.2%;         /* Red - delete/cancel */
--success: 142 76% 36%;               /* Green - completed/mastered */
--warning: 38 92% 50%;                /* Yellow - pending/scheduled */
```

### Status Color Mapping

```typescript
// From /lib/utils/statusColors.ts
const statusColors = {
  // Song progress
  to_learn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  started: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  remembered: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  mastered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

  // Lesson status
  scheduled: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-purple-100 text-purple-800',
};
```

---

## Component Patterns

### Card with Animation

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -2 }}
  transition={{ duration: 0.2 }}
>
  <Card className="bg-card rounded-xl border border-border shadow-sm">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-semibold">Title</CardTitle>
      <CardDescription>Description text</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Content */}
    </CardContent>
    <CardFooter className="flex flex-col gap-2 sm:flex-row border-t pt-4">
      <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
      <Button className="w-full sm:w-auto">Save</Button>
    </CardFooter>
  </Card>
</motion.div>
```

### Mobile-First Table with Cards

```tsx
<div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
  {/* Mobile Cards */}
  <motion.div
    className="md:hidden space-y-3 p-4"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
  >
    {items.map(item => (
      <motion.div
        key={item.id}
        variants={itemVariants}
        whileTap={{ scale: 0.98 }}
        className="rounded-lg border p-4 space-y-3 active:bg-muted/50"
      >
        <div className="flex justify-between items-start">
          <span className="font-medium">{item.name}</span>
          <Badge variant={getStatusVariant(item.status)}>
            {item.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">Edit</Button>
          <Button size="sm" variant="ghost" className="flex-1">View</Button>
        </div>
      </motion.div>
    ))}
  </motion.div>

  {/* Desktop Table */}
  <div className="hidden md:block overflow-x-auto">
    <Table className="min-w-[600px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => (
          <motion.tr
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
            className="border-b transition-colors"
          >
            <TableCell>{item.name}</TableCell>
            <TableCell><Badge>{item.status}</Badge></TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">Edit</Button>
            </TableCell>
          </motion.tr>
        ))}
      </TableBody>
    </Table>
  </div>
</div>
```

### Animated Empty State

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
  className="flex flex-col items-center justify-center py-12 px-4 text-center"
>
  <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ duration: 2, repeat: Infinity }}
  >
    <Music className="h-12 w-12 text-muted-foreground mb-4" />
  </motion.div>
  <h3 className="text-lg font-semibold mb-2">No songs yet</h3>
  <p className="text-muted-foreground mb-4 max-w-sm">
    Start building your repertoire by adding your first song.
  </p>
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Song
    </Button>
  </motion.div>
</motion.div>
```

---

## Dark Mode

Always include dark mode variants:

```tsx
// Background
className="bg-white dark:bg-gray-900"

// Text
className="text-gray-900 dark:text-gray-100"

// Borders
className="border-gray-200 dark:border-gray-700"

// Status badges
className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
```

---

## Accessibility Checklist

- [ ] All interactive elements have focus states
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Form inputs have associated labels
- [ ] Error messages use `aria-describedby`
- [ ] Loading states announced to screen readers
- [ ] Keyboard navigation works throughout
- [ ] Touch targets are at least 44x44px
- [ ] Reduced motion is respected
- [ ] No content is lost on zoom up to 200%

---

## Mobile Testing Checklist

### iPhone SE (375 x 667px) - Minimum Target
- [ ] All content visible without horizontal scroll
- [ ] Touch targets at least 44x44px
- [ ] Text readable at 16px minimum
- [ ] Forms usable with on-screen keyboard (keyboard doesn't cover inputs)
- [ ] Bottom navigation doesn't overlap content
- [ ] Modals fit within viewport and are scrollable
- [ ] Cards and lists don't overflow

### iPhone 17 Pro Max (430 x 932px) - Large Phone Target
- [ ] Layout scales well (no awkward gaps)
- [ ] Images fill space appropriately
- [ ] Dynamic Island / notch area respected (safe-area-inset)
- [ ] Content takes advantage of extra width
- [ ] Bottom home indicator area clear

### Both Devices
- [ ] Swipe gestures work smoothly
- [ ] Animations are smooth (60fps)
- [ ] Dark mode works correctly
- [ ] Portrait and landscape orientations supported
- [ ] Pull-to-refresh works where expected

### Chrome DevTools Testing
```
iPhone SE: 375 x 667 (Device Pixel Ratio: 2)
iPhone 17 Pro Max: 430 x 932 (Device Pixel Ratio: 3)
```
