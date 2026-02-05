# Schedule Page MCP Playwright Tests

## Overview

Comprehensive browser automation tests for the `/schedule` page using Playwright MCP server. These tests focus heavily on **mobile functionality** and cover all 150+ features documented in the feature inventory.

## Test Files

### 1. `scheduling-mcp-mobile.spec.ts` (50 tests)
**Focus**: Mobile-first testing with emphasis on responsive design and touch interactions

- **Mobile Layout & Responsive Design** (10 tests)
  - Viewport compatibility
  - Touch target sizes (44x44px minimum)
  - Sidebar visibility
  - Full-screen modals

- **Mobile Touch Interactions** (5 tests)
  - Tap gestures
  - Swipe handling
  - Long press detection
  - Double tap zoom prevention

- **Mobile Drag & Drop Challenges** (3 tests)
  - Documents DnD limitations on mobile
  - Alternative scheduling methods

- **Mobile Performance** (4 tests)
  - Render time < 3s
  - Console error detection
  - Smooth scrolling (60fps)
  - Image optimization

- **Mobile Accessibility** (4 tests)
  - Text readability (min 16px)
  - ARIA labels
  - Focus visibility
  - Color contrast (WCAG AA)

- **Mobile Modal Behavior** (4 tests)
  - Scrollable modals
  - Story preview hidden on mobile
  - Touch-friendly close buttons
  - Swipe to close (if implemented)

- **Mobile Navigation** (3 tests)
  - Date navigation
  - Today button
  - Granularity controls

- **Mobile-Specific Issues** (7 tests)
  - Keyboard covering inputs
  - Landscape orientation
  - Safe area insets (iOS notch)
  - Pull-to-refresh disabled
  - No horizontal scroll
  - Toast visibility

- **Tablet Viewport** (3 tests)
  - iPad 768x1024
  - Two-column layout
  - Drag and drop support

- **Extreme Mobile Conditions** (7 tests)
  - Very small screen (iPhone SE 320x568)
  - Large phone (iPhone Pro Max 428x926)
  - Slow 3G network simulation
  - Offline mode handling
  - Low memory optimization
  - Battery saver mode
  - OLED dark mode optimization

### 2. `scheduling-mcp-comprehensive.spec.ts` (50+ tests)
**Focus**: Desktop functionality and core features

- **Calendar Grid Tests** (CAL-MCP-01 to 10)
  - 18 time slots (6 AM - 11 PM)
  - Current time indicator
  - Time block hover effects
  - Drop zone highlighting
  - "+N" overflow buttons
  - Status colors (blue/green/red/yellow)
  - Published items non-draggable
  - Today highlight

- **Granularity Control Tests** (GRAN-MCP-01 to 08)
  - Plus/minus buttons (60→30→15→5→1 minutes)
  - Button disabled states
  - Ctrl+Scroll shortcuts
  - Visual resize of time blocks

- **Sidebar Tests** (SIDE-MCP-01 to 12)
  - "Ready to Schedule" header
  - Filter tabs (All/Recent/Approved)
  - View density toggle (Comfortable/Compact)
  - Card metadata display
  - Three-dot menu
  - Quick schedule popover
  - Already scheduled overlay
  - Empty state

- **Access Control Tests** (AUTH-MCP-01 to 04)
  - Admin access
  - Developer access
  - User redirect
  - Unauthenticated redirect

- **Performance Tests** (PERF-MCP-01 to 05)
  - Calendar render < 2s (100 items)
  - Smooth drag operations
  - Instant granularity changes
  - Modal open < 500ms
  - Search results < 300ms

### 3. `scheduling-mcp-modals-navigation.spec.ts` (50+ tests)
**Focus**: Modals, navigation, and advanced interactions

- **Quick Schedule Popover Tests** (QS-MCP-01 to 12)
  - Click to open
  - Thumbnail and title display
  - Calendar month navigation
  - Past dates disabled
  - Time picker (hour/minute)
  - Quick pick buttons:
    - "In 1 hour"
    - "Tomorrow 9am"
    - "Tomorrow noon"
    - "Tomorrow 6pm"
  - Schedule button loading
  - Success toast
  - Escape key closes

- **Navigation Tests** (NAV-MCP-01 to 08)
  - Previous/next day buttons
  - Today button
  - Date display updates
  - Past/future navigation
  - Scheduled items loading
  - Current time indicator (today only)

- **Search Tests** (SEARCH-MCP-01 to 05)
  - Input acceptance
  - Calendar filtering
  - Sidebar filtering
  - Clear search
  - Real-time updates

- **Drag & Drop Advanced** (DD-MCP-01 to 15)
  - Sidebar to calendar scheduling
  - Success toast with formatted time
  - Item appears in grid
  - Item removed from sidebar
  - Rescheduling existing items
  - Published items non-draggable
  - Drop precision matching granularity
  - Visual feedback (opacity, scale, shadow)
  - Time indicator on drop zone
  - Invalid drop handling
  - Concurrent drag handling
  - Version conflict errors
  - SWR refetch trigger
  - Rapid successive drops
  - Drag overlay preview

- **Dark Mode Tests** (DARK-MCP-01 to 04)
  - Dark mode color application
  - Text contrast
  - Card styling
  - Status color visibility

- **Error Handling Tests** (ERR-MCP-01 to 08)
  - API error toasts
  - Network timeout handling
  - Version conflicts
  - Cannot reschedule published
  - Invalid date validation
  - Character limit (2200)
  - Empty required fields
  - Insights fetch errors

## Total Test Coverage

- **Total Tests**: 150+
- **Mobile-Specific Tests**: 50
- **Desktop Tests**: 50+
- **Modal/Navigation Tests**: 50+

## Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### Run All MCP Tests

```bash
# All MCP tests
npx playwright test __tests__/e2e/scheduling-mcp-*.spec.ts

# Mobile tests only
npx playwright test __tests__/e2e/scheduling-mcp-mobile.spec.ts

# Desktop tests only
npx playwright test __tests__/e2e/scheduling-mcp-comprehensive.spec.ts

# Modals & navigation tests only
npx playwright test __tests__/e2e/scheduling-mcp-modals-navigation.spec.ts
```

### Run with Different Viewports

```bash
# Mobile (iPhone X)
npx playwright test --project=mobile

# Tablet (iPad)
npx playwright test --project=tablet

# Desktop (Chrome)
npx playwright test --project=chromium
```

### Debug Mode

```bash
# Run tests in headed mode with slow motion
npx playwright test --headed --slow-mo=500

# Run specific test
npx playwright test -g "MOB-MCP-01"

# Debug with inspector
npx playwright test --debug
```

### Generate Test Report

```bash
# Run tests and generate HTML report
npx playwright test --reporter=html

# View report
npx playwright show-report
```

## Mobile Testing Strategy

### Why Focus on Mobile?

The schedule page is complex with drag-and-drop functionality that may not work well on mobile devices. These tests:

1. **Document mobile limitations** (e.g., DnD with touch)
2. **Verify responsive design** (sidebar hiding, full-screen modals)
3. **Ensure accessibility** (touch targets, text size, contrast)
4. **Test performance** (render time, smooth scrolling)
5. **Validate extreme conditions** (small screens, slow networks, offline)

### Known Mobile Issues to Watch For

Based on the tests, these issues may exist:

- ✅ **Sidebar hidden on mobile** - Expected behavior
- ⚠️ **Drag & drop may not work with touch** - Alternative scheduling needed
- ✅ **Modals should be full-screen** - Verify implementation
- ⚠️ **Touch targets < 44px** - Accessibility concern
- ⚠️ **Keyboard covering input fields** - iOS issue to fix
- ✅ **Pull-to-refresh should be disabled** - Verify CSS
- ⚠️ **Horizontal scroll on small screens** - Layout issue

## Test Data Requirements

### Minimum Test Data Needed

- **Ready to Schedule Items**: At least 5 approved items
- **Scheduled Items**: At least 10 items across different time slots
- **Published Items**: At least 2 items (to test non-draggable state)
- **Failed Items**: At least 1 item (to test error display)

### Seed Data Script

```bash
# Run seed script to create test data
npm run seed:test-schedule
```

## Playwright Configuration

### Mobile Devices Configured

```typescript
// playwright.config.ts
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] }, // 393x851
},
{
  name: 'Mobile Safari',
  use: { ...devices['iPhone 12'] }, // 390x844
},
{
  name: 'Tablet',
  use: { ...devices['iPad Pro'] }, // 1024x1366
}
```

### Viewport Sizes Tested

- **iPhone SE**: 320x568 (smallest)
- **iPhone X**: 375x812 (default mobile)
- **iPhone Pro Max**: 428x926 (largest phone)
- **iPad**: 768x1024 (tablet)
- **iPad Pro**: 1024x1366 (large tablet)
- **Desktop**: 1280x720 (default desktop)

## CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Run Mobile Tests
  run: npx playwright test __tests__/e2e/scheduling-mcp-mobile.spec.ts --project=mobile

- name: Run Desktop Tests
  run: npx playwright test __tests__/e2e/scheduling-mcp-comprehensive.spec.ts --project=chromium

- name: Run All MCP Tests
  run: npx playwright test __tests__/e2e/scheduling-mcp-*.spec.ts
```

### Parallel Execution

Tests are designed to run in parallel with proper authentication handling:

```bash
# Run with 4 parallel workers
npx playwright test --workers=4
```

## Debugging Failed Tests

### Screenshots on Failure

Automatic screenshots are captured in `test-results/`:

```bash
test-results/
  scheduling-mcp-mobile-MOB-MCP-01-failed.png
  scheduling-mcp-mobile-MOB-MCP-01-trace.zip
```

### View Trace

```bash
npx playwright show-trace test-results/scheduling-mcp-mobile-MOB-MCP-01-failed-trace.zip
```

### Console Errors

Tests automatically capture console errors:

```typescript
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.error('Browser error:', msg.text());
  }
});
```

## Accessibility Testing

### WCAG Compliance Checks

- ✅ Touch targets ≥ 44x44px (Level AA)
- ✅ Text size ≥ 16px (mobile)
- ✅ Color contrast ≥ 4.5:1 (Level AA)
- ✅ Focus indicators visible
- ✅ ARIA labels on icon buttons
- ✅ Keyboard navigation support

## Performance Benchmarks

### Target Metrics

- **Calendar Render**: < 2s (desktop), < 3s (mobile)
- **Drag Operation**: < 2s smooth
- **Granularity Change**: < 500ms
- **Modal Open**: < 500ms
- **Search Results**: < 300ms

### Monitoring

Performance metrics are logged in test output:

```bash
✓ PERF-MCP-01: Calendar renders <2s with 100 items (1247ms)
✓ PERF-MCP-02: Drag operation smooth (523ms)
```

## Future Enhancements

### Tests to Add

1. **Preview Modal Tests** (PREV-MCP-01 to 20) - Full modal coverage
2. **Edit Modal Tests** (EDIT-MCP-01 to 15) - Form validation
3. **Responsive Breakpoints** - Test all breakpoints (sm, md, lg, xl)
4. **Multi-Browser** - Firefox, Safari, Edge
5. **Real Device Testing** - BrowserStack/Sauce Labs
6. **Visual Regression** - Screenshot comparison
7. **Load Testing** - 1000+ items performance

### Tools to Integrate

- **Axe Accessibility**: Automated a11y scanning
- **Lighthouse**: Performance auditing
- **Percy**: Visual regression testing
- **BrowserStack**: Real device testing

## Contributing

When adding new features to `/schedule`, update these test files:

1. Add test case to appropriate file
2. Update feature count in this README
3. Run tests to ensure no regressions
4. Update CI/CD workflow if needed

## Questions?

See the main feature inventory in the planning document or ask the team.
