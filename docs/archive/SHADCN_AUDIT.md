# Shadcn/UI Component Audit - Full Replacement Plan

**Generated**: 2026-02-08
**Total findings**: ~217 across ~45 files
**Severity breakdown**: 158 HIGH, 47 MEDIUM, 12 LOW

---

## Prerequisites

### Already Installed shadcn Components
`alert`, `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `skeleton`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip`

### Components to Install from Registry
```bash
npx shadcn@latest add spinner drawer empty collapsible
```

---

## HIGH Severity (direct shadcn replacement exists)

| # | File | Custom Pattern | shadcn Replacement | Installed? |
|---|------|---------------|-------------------|------------|
| 1 | `ui/loading-spinner.tsx` | Custom spinner (Lucide Loader + animate-spin). **BUG**: dynamic Tailwind classes won't work at build time | `spinner` | No |
| 2 | `ui/status-badge.tsx` | Custom `<span>` badge with hardcoded color classes per status | `Badge` | Yes |
| 3 | `ui/meme-status-badge.tsx` | Custom `<span>` badge with icons + border per status | `Badge` | Yes |
| 4 | `ui/media-modal.tsx` | Full custom modal/lightbox. No focus trap, no ESC key, manual scroll lock | `Dialog` | Yes |
| 5 | `ui/mobile-action-sheet.tsx` | Custom bottom sheet. No focus trap, no swipe-to-dismiss, no a11y | `Drawer` or `Sheet` | No |
| 6 | `ui/empty-state.tsx` | Custom empty state (icon + title + description + action) | `Empty` | No |
| 7 | `ui/panel.tsx` | Custom card container (bg, rounded, shadow, border, header) -- used in **8+ files** | `Card`/`CardHeader`/`CardTitle`/`CardContent` | Yes |
| 8 | `ui/confirmation-dialog.tsx` | Full custom confirmation dialog. No focus trap, no ESC key, raw buttons | `AlertDialog` | Yes |
| 9 | `layout/notification-bell.tsx` | Custom popover dropdown (manual click-outside), custom badge, custom empty state, **re-implements cn()** | `Popover` + `Badge` + `Button` + `ScrollArea` | Yes |
| 10 | `media/image-dimensions-badge.tsx` | Custom badge-like `<div>` for dimensions display | `Badge` | Yes |
| 11 | `media/aspect-ratio-indicator.tsx` (compact) | Badge-like `<div>` with icon + text | `Badge` | Yes |
| 12 | `media/aspect-ratio-indicator.tsx` (full) | Alert-like `<div>` with icon + title + description | `Alert` | Yes |
| 13 | `media/aspect-ratio-indicator.tsx` (buttons) | Raw `<button>` elements in ProcessingPrompt | `Button` | Yes |
| 14 | `home/client-form.tsx` | Raw `<button>` "Use Sample" | `Button` (variant=outline) | Yes |
| 15 | `home/client-form.tsx` | Raw `<input type="url">` | `Input` | Yes |
| 16 | `home/client-form.tsx` | Raw `<label>` | `Label` | Yes |
| 17 | `home/client-form.tsx` | Raw `<button>` "Quick Publish" submit | `Button` | Yes |
| 18 | `home/home-header.tsx` | Custom inline badge "v1.2 Agent Ready" | `Badge` | Yes |
| 19 | `home/status-section.tsx` | Custom badge "Awaiting Auth" | `Badge` | Yes |
| 20 | `home/status-section.tsx` | Custom status card (icon + title + description) | `Alert` | Yes |
| 21 | `auth/logout-button.tsx` | Raw `<button>` with destructive styling | `Button` (variant=destructive) | Yes |
| 22 | `auth/connect-facebook-button.tsx` | Raw `<button>` with conditional styling | `Button` | Yes |
| 23 | `auth/extend-token-button.tsx` | Raw `<button>` with amber styling | `Button` | Yes |
| 24 | `settings/settings-form.tsx` | Custom `ConfigInput` with raw `<input>` | `Input` + `Label` | Yes |
| 25 | `settings/settings-form.tsx` | Raw `<label>` elements | `Label` | Yes |
| 26 | `settings/settings-form.tsx` | Raw `<button>` show/hide secret toggle | `Button` (variant=ghost, size=icon) | Yes |
| 27 | `settings/settings-form.tsx` | Raw `<button>` copy action | `Button` (variant=ghost, size=icon) | Yes |
| 28 | `settings/settings-form.tsx` | Warning alert div (yellow styling + AlertCircle) | `Alert` | Yes |
| 29 | `settings/settings-form.tsx` | 5x card sections (same pattern: bg, rounded, border, icon header) | `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` | Yes |
| 30 | `settings/settings-form.tsx` | Raw `<button>` "Generate All" | `Button` | Yes |
| 31 | `settings/settings-form.tsx` | Raw `<button>` "Show/Hide .env" | `Button` | Yes |
| 32 | `settings/settings-form.tsx` | Raw `<button>` "Save Configuration" | `Button` | Yes |
| 33 | `settings/settings-form.tsx` | Raw `<button>` "Download" | `Button` | Yes |
| 34 | `schedule/post-list.tsx` | Raw `<button>` "Show/Hide Filters" | `Button` | Yes |
| 35 | `schedule/post-list.tsx` | Custom inline badge "Active" | `Badge` | Yes |
| 36 | `schedule/post-list.tsx` | Raw `<button>` "Clear" filters | `Button` | Yes |
| 37 | `schedule/post-list.tsx` | Raw `<input type="text">` search | `Input` | Yes |
| 38 | `schedule/post-list.tsx` | Raw `<select>` status filter | `Select` | Yes |
| 39 | `schedule/post-list.tsx` | Raw `<input type="date">` x2 (From/To) | `Input` or `Calendar`+`Popover` | Yes |
| 40 | `schedule/post-list.tsx` | Raw `<label>` elements x4 | `Label` | Yes |
| 41 | `schedule/schedule-manager.tsx` | Raw `<button>` refresh icon | `Button` (variant=ghost, size=icon) | Yes |
| 42 | `schedule/schedule-manager.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 43 | `schedule/process-button.tsx` | Raw `<button>` with green styling | `Button` | Yes |
| 44 | `schedule/schedule-form.tsx` | Raw `<label>` elements x6 | `Label` | Yes |
| 45 | `schedule/schedule-form.tsx` | Raw `<input type="url">` | `Input` | Yes |
| 46 | `schedule/schedule-form.tsx` | Raw `<textarea>` | `Textarea` | Yes |
| 47 | `schedule/schedule-form.tsx` | Custom progress bar (div-based) | `Progress` | Yes |
| 48 | `schedule/schedule-form.tsx` | Custom IMAGE/VIDEO toggle buttons | `ToggleGroup` | Yes |
| 49 | `schedule/schedule-form.tsx` | Raw `<button type="submit">` | `Button` | Yes |
| 50 | `schedule/schedule-form.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 51 | `schedule/insights-panel.tsx` | Full custom modal (backdrop + positioning + animation) | `Dialog` | Yes |
| 52 | `schedule/insights-panel.tsx` | Raw `<button>` "Try Again" | `Button` (variant=destructive) | Yes |
| 53 | `schedule/insights-panel.tsx` | Raw `<button>` "Close View" | `Button` | Yes |
| 54 | `schedule/insights-panel.tsx` | Custom error panel (rose styling) | `Alert` (variant=destructive) | Yes |
| 55 | `debug/token-info-panel.tsx` | Custom status banner (conditional emerald/rose) | `Alert` | Yes |
| 56 | `debug/token-info-panel.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 57 | `debug/debug-publisher.tsx` | Custom card container | `Card` | Yes |
| 58 | `debug/debug-publisher.tsx` | Custom card header (h2 + subtitle) | `CardHeader`/`CardTitle`/`CardDescription` | Yes |
| 59 | `debug/debug-publisher.tsx` | Raw `<input type="text">` for URL | `Input` | Yes |
| 60 | `debug/debug-publisher.tsx` | Raw `<button>` upload | `Button` | Yes |
| 61 | `debug/debug-publisher.tsx` | Raw `<button>` publish | `Button` | Yes |
| 62 | `debug/debug-publisher.tsx` | Custom success/error result display | `Alert` | Yes |
| 63 | `debug/debug-publisher.tsx` | Raw `<button>` "Clear" logs | `Button` | Yes |
| 64 | `debug/debug-publisher.tsx` | Raw `<label>` | `Label` | Yes |
| 65 | `debug/permissions-panel.tsx` | Custom permission badges (emerald/rose divs) | `Badge` | Yes |
| 66 | `debug/permissions-panel.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 67 | `debug/pages-panel.tsx` | Custom error card (rose styling) | `Alert` (variant=destructive) | Yes |
| 68 | `debug/pages-panel.tsx` | Custom ID badge | `Badge` | Yes |
| 69 | `debug/pages-panel.tsx` | Custom "Ready" status indicator | `Badge` | Yes |
| 70 | `debug/pages-panel.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 71 | `debug/user-profile-panel.tsx` | Custom avatar (Image + fallback div) | `Avatar`/`AvatarImage`/`AvatarFallback` | Yes |
| 72 | `debug/user-profile-panel.tsx` | Custom "Authenticated" badge | `Badge` | Yes |
| 73 | `debug/user-profile-panel.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 74 | `insights/quota-usage-card.tsx` | Raw `<button>` refresh | `Button` | Yes |
| 75 | `insights/quota-usage-card.tsx` | Custom skeleton loading (animate-pulse divs) | `Skeleton` | Yes |
| 76 | `insights/quota-usage-card.tsx` | Custom progress bar (div-based) | `Progress` | Yes |
| 77 | `insights/quota-usage-card.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 78 | `insights/insights-dashboard.tsx` | Raw `<button>` refresh | `Button` | Yes |
| 79 | `insights/insights-dashboard.tsx` | Custom badge for post type | `Badge` | Yes |
| 80 | `insights/insights-dashboard.tsx` | Custom "View Insights" action badge | `Button` (size=sm) or `Badge` | Yes |
| 81 | `insights/insights-dashboard.tsx` | Custom error badge (rose) | `Badge` (variant=destructive) | Yes |
| 82 | `insights/insights-dashboard.tsx` | Uses `<Panel>` wrapper | `Card` | Yes |
| 83 | `debug/debug-dashboard.tsx` | Custom error container (rose styling) | `Alert` (variant=destructive) | Yes |
| 84 | `debug/debug-dashboard.tsx` | Raw `<button>` "Retry Connection" | `Button` (variant=destructive) | Yes |
| 85 | `debug/debug-dashboard.tsx` | Raw `<button>` "Refresh Stats" | `Button` (variant=outline) | Yes |
| 86 | `memes/admin-meme-card.tsx` | Custom card container | `Card` | Yes |
| 87 | `memes/admin-meme-card.tsx` | Custom status badge (color per status) | `Badge` | Yes |
| 88 | `memes/admin-meme-card.tsx` | Raw `<button>` Approve (green) | `Button` | Yes |
| 89 | `memes/admin-meme-card.tsx` | Raw `<button>` Reject (red) | `Button` (variant=destructive) | Yes |
| 90 | `memes/admin-meme-card.tsx` | Raw `<button>` Publish Now | `Button` | Yes |
| 91 | `memes/admin-meme-card.tsx` | Raw `<button>` Schedule | `Button` (variant=outline) | Yes |
| 92 | `memes/meme-action-modal.tsx` | Full custom modal (overlay + panel + isOpen logic) | `Dialog` | Yes |
| 93 | `memes/meme-action-modal.tsx` | Custom close button (X icon) | Built into `DialogContent` | Yes |
| 94 | `memes/meme-action-modal.tsx` | Raw `<input type="datetime-local">` | `Input` | Yes |
| 95 | `memes/meme-action-modal.tsx` | Raw `<textarea>` rejection reason | `Textarea` | Yes |
| 96 | `memes/meme-action-modal.tsx` | Raw `<label>` elements x2 | `Label` | Yes |
| 97 | `memes/meme-action-modal.tsx` | Raw `<button>` Cancel | `Button` (variant=outline) | Yes |
| 98 | `memes/meme-action-modal.tsx` | Raw `<button>` Confirm | `Button` | Yes |
| 99 | `memes/meme-edit-modal.tsx` | Full custom modal (backdrop + panel) | `Dialog` | Yes |
| 100 | `memes/meme-edit-modal.tsx` | Custom close button (X icon) | Built into `DialogContent` | Yes |
| 101 | `memes/meme-edit-modal.tsx` | Raw `<input type="text">` title | `Input` | Yes |
| 102 | `memes/meme-edit-modal.tsx` | Raw `<textarea>` caption | `Textarea` | Yes |
| 103 | `memes/meme-edit-modal.tsx` | Raw `<label>` elements x2 | `Label` | Yes |
| 104 | `memes/meme-edit-modal.tsx` | Custom error alert (rose styling) | `Alert` (variant=destructive) | Yes |
| 105 | `memes/meme-edit-modal.tsx` | Custom media type badge | `Badge` | Yes |
| 106 | `memes/meme-edit-modal.tsx` | Raw `<button>` Cancel | `Button` (variant=outline) | Yes |
| 107 | `memes/meme-edit-modal.tsx` | Raw `<button>` Save Changes | `Button` | Yes |
| 108 | `memes/meme-search-filter.tsx` | Raw `<input type="text">` search | `Input` | Yes |
| 109 | `memes/meme-search-filter.tsx` | Raw `<button>` clear search (X) | `Button` (variant=ghost, size=icon) | Yes |
| 110 | `memes/meme-search-filter.tsx` | Custom toggle buttons for status filter | `ToggleGroup`/`Toggle` | Yes |
| 111 | `memes/meme-manager.tsx` | Raw `<button>` "Submit New Meme" / "Cancel" | `Button` | Yes |
| 112 | `memes/meme-manager.tsx` | Raw `<button>` Previous pagination | `Button` (variant=outline) | Yes |
| 113 | `memes/meme-manager.tsx` | Raw `<button>` Next pagination | `Button` | Yes |
| 114 | `memes/meme-manager.tsx` | Uses `confirm()` browser dialog for delete | `AlertDialog` | Yes |
| 115 | `memes/meme-submit-form.tsx` | Raw `<label>` elements x3 | `Label` | Yes |
| 116 | `memes/meme-submit-form.tsx` | Raw `<input type="text">` title | `Input` | Yes |
| 117 | `memes/meme-submit-form.tsx` | Raw `<input type="text">` caption | `Input` | Yes |
| 118 | `memes/meme-submit-form.tsx` | Custom progress bar (div-based) | `Progress` | Yes |
| 119 | `memes/meme-submit-form.tsx` | Raw `<button>` clear media (X) | `Button` (variant=ghost, size=icon) | Yes |
| 120 | `memes/meme-submit-form.tsx` | Raw `<button>` submit | `Button` | Yes |
| 121 | `inbox/message-composer.tsx` | Raw `<textarea>` | `Textarea` | Yes |
| 122 | `inbox/message-composer.tsx` | Raw `<button>` Send | `Button` | Yes |
| 123 | `inbox/message-composer.tsx` | Custom error banner (red styling) | `Alert` (variant=destructive) | Yes |
| 124 | `inbox/conversation-list.tsx` | Custom avatar fallback (gradient div) | `Avatar`/`AvatarFallback` | Yes |
| 125 | `inbox/conversation-list.tsx` | Raw `<img>` profile picture | `Avatar`/`AvatarImage` | Yes |
| 126 | `inbox/conversation-list.tsx` | Custom unread count badge | `Badge` | Yes |
| 127 | `inbox/inbox-manager.tsx` | Custom spinner (CSS border animation) | `Spinner` | No |
| 128 | `inbox/inbox-manager.tsx` | Custom error display (red styling) | `Alert` (variant=destructive) | Yes |
| 129 | `inbox/inbox-manager.tsx` | Raw `<button>` "Try Again" | `Button` | Yes |
| 130 | `inbox/inbox-manager.tsx` | Raw `<button>` "Sync" | `Button` | Yes |
| 131 | `inbox/inbox-manager.tsx` | Custom card container | `Card` | Yes |
| 132 | `inbox/message-thread.tsx` | Raw `<button>` back navigation | `Button` (variant=ghost, size=icon) | Yes |
| 133 | `inbox/message-thread.tsx` | Raw `<button>` Sync | `Button` | Yes |
| 134 | `inbox/message-thread.tsx` | Custom spinner (CSS border animation) | `Spinner` | No |
| 135 | `inbox/message-thread.tsx` | Custom avatar fallback | `Avatar`/`AvatarFallback` | Yes |
| 136 | `inbox/message-thread.tsx` | Raw `<img>` profile picture | `Avatar`/`AvatarImage` | Yes |
| 137 | `developer/cron-status-panel.tsx` | Custom skeleton (animate-pulse div) | `Skeleton` | Yes |
| 138 | `developer/cron-status-panel.tsx` | Custom card per cron job | `Card` | Yes |
| 139 | `developer/cron-status-panel.tsx` | Custom status badge (success/error colors) | `Badge` | Yes |
| 140 | `developer/stuck-locks-panel.tsx` | Custom skeleton (animate-pulse div) | `Skeleton` | Yes |
| 141 | `developer/stuck-locks-panel.tsx` | Custom alert/warning banner (rose) | `Alert` (variant=destructive) | Yes |
| 142 | `developer/stuck-locks-panel.tsx` | Raw `<button>` Release lock | `Button` (variant=destructive) | Yes |
| 143 | `developer/failed-posts-panel.tsx` | Custom skeleton (animate-pulse div) | `Skeleton` | Yes |
| 144 | `developer/failed-posts-panel.tsx` | Custom card per failed post | `Card` | Yes |
| 145 | `developer/failed-posts-panel.tsx` | Custom retry count badge | `Badge` (variant=destructive) | Yes |
| 146 | `developer/failed-posts-panel.tsx` | Raw `<button>` Retry | `Button` | Yes |
| 147 | `developer/failed-posts-panel.tsx` | Custom collapsible error detail | `Collapsible` | No |
| 148 | `developer/manual-controls.tsx` | Custom warning alert (amber) | `Alert` | Yes |
| 149 | `developer/manual-controls.tsx` | Raw `<button>` x3 job triggers | `Button` | Yes |
| 150 | `developer/logs-viewer.tsx` | Custom tab-like toggle buttons (System/Publishing) | `Tabs`/`TabsList`/`TabsTrigger` | Yes |
| 151 | `developer/logs-viewer.tsx` | Raw `<select>` time range filter | `Select` | Yes |
| 152 | `developer/logs-viewer.tsx` | Custom skeleton x3 (animate-pulse divs) | `Skeleton` | Yes |
| 153 | `developer/logs-viewer.tsx` | Custom collapsible log entries | `Collapsible` | No |
| 154 | `developer/logs-viewer.tsx` | Custom log level badges (error/warn/info) | `Badge` | Yes |
| 155 | `developer/logs-viewer.tsx` | Custom publishing status badges (SUCCESS/FAIL) | `Badge` | Yes |
| 156 | `developer/logs-viewer.tsx` | Raw `<button>` Previous pagination | `Button` | Yes |
| 157 | `developer/logs-viewer.tsx` | Raw `<button>` Next pagination | `Button` | Yes |
| 158 | `developer/health-metrics.tsx` | Custom skeleton x4 (animate-pulse divs) | `Skeleton` | Yes |

---

## MEDIUM Severity (partial replacement or non-installed component)

| # | File | Custom Pattern | shadcn Replacement |
|---|------|---------------|-------------------|
| 159 | `ui/theme-toggle.tsx` | Raw `<button>` for theme toggle | `Button` (size=icon) or `Toggle` |
| 160 | `layout/theme-toggle.tsx` | Duplicate raw `<button>` theme toggle | `Button` or `Toggle` (+ deduplicate) |
| 161 | `ui/tag-input.tsx` | Raw `<input>`, `<button>`, styled divs as tag pills | `Badge` + `Input` + `Button` (composed) |
| 162 | `ui/expandable-caption.tsx` | Custom expand/collapse + raw `<button>` | `Collapsible` + `Button` |
| 163 | `home/client-form.tsx` | Custom spinner (CSS border animation) | `Spinner` |
| 164 | `home/client-form.tsx` | Form layout using plain divs | `Card`/`CardContent` |
| 165 | `home/status-section.tsx` | Card-like container for status | `Card` |
| 166 | `home/status-section.tsx` | Overall section wrapper | `Card`/`CardHeader` |
| 167 | `home/status-section.tsx` | Navigation links with arrow icons | `Button` (variant=link) |
| 168 | `home/webhook-section.tsx` | Card-like styled div container | `Card`/`CardContent` |
| 169 | `auth/connect-facebook-button.tsx` | Custom CSS spinner | `Spinner` |
| 170 | `settings/settings-form.tsx` | Custom loading state (spinning RefreshCw) | `Spinner` or `Skeleton` |
| 171 | `settings/settings-form.tsx` | Success/error status messages | `Alert` or `Badge` |
| 172 | `providers/toast-provider.tsx` | Direct `sonner` import instead of shadcn wrapper | `Sonner` (shadcn wrapper) |
| 173 | `schedule/post-list.tsx` | Custom filter panel container | `Card`/`CardContent` |
| 174 | `schedule/schedule-manager.tsx` | Custom `<LoadingSpinner>` | `Spinner` or `Skeleton` |
| 175 | `schedule/process-button.tsx` | Uses `alert()` for results | `Dialog` or toast |
| 176 | `schedule/schedule-form.tsx` | Custom separator divs | `Separator` |
| 177 | `schedule/schedule-form.tsx` | Raw `<form>` (react-hook-form without shadcn Form) | `Form`/`FormField`/`FormItem` |
| 178 | `schedule/insights-panel.tsx` | Custom loading spinner (Loader2) | `Spinner` |
| 179 | `schedule/insights-panel.tsx` | Custom stat cards | `Card`/`CardContent` |
| 180 | `schedule/insights-panel.tsx` | Custom scrollable area | `ScrollArea` |
| 181 | `debug/token-info-panel.tsx` | Custom metadata card | `Card`/`CardContent` |
| 182 | `debug/debug-publisher.tsx` | Custom logs section (dark terminal) | `ScrollArea` + `Card` |
| 183 | `debug/pages-panel.tsx` | Custom list item cards | `Card` |
| 184 | `debug/pages-panel.tsx` | Custom IG linked account badge/card | `Badge` or `Alert` |
| 185 | `debug/pages-panel.tsx` | Custom warning (amber, no linked IG) | `Alert` |
| 186 | `insights/insights-dashboard.tsx` | Custom clickable list item cards | `Card` |
| 187 | `insights/insights-dashboard.tsx` | Custom `<LoadingSpinner>` | `Spinner` |
| 188 | `debug/debug-dashboard.tsx` | Custom `<LoadingSpinner>` | `Spinner` |
| 189 | `memes/meme-manager.tsx` | Custom info badge with pulsing dot | `Badge` |
| 190 | `memes/meme-manager.tsx` | Custom pagination (Prev/Next + page count) | `Pagination` |
| 191 | `memes/meme-action-modal.tsx` | Raw `<form>` | `Form` |
| 192 | `memes/meme-action-modal.tsx` | Custom spinner (Loader animate-spin) | `Spinner` |
| 193 | `memes/meme-submit-form.tsx` | Custom spinner (Loader animate-spin) | `Spinner` |
| 194 | `memes/meme-submit-form.tsx` | Custom error text for validation | `Form` field errors |
| 195 | `memes/meme-submit-form.tsx` | Raw `<form>` with react-hook-form | `Form` |
| 196 | `inbox/conversation-list.tsx` | Custom empty state | `Empty` |
| 197 | `inbox/conversation-list.tsx` | Raw `<button>` conversation row | `Button` (variant=ghost) or `Item` |
| 198 | `inbox/message-thread.tsx` | Scrollable message area (overflow-y-auto) | `ScrollArea` |
| 199 | `developer/stuck-locks-panel.tsx` | Custom spinner (Loader animate-spin) | `Spinner` |
| 200 | `developer/stuck-locks-panel.tsx` | Custom card per stuck post | `Card` |
| 201 | `developer/failed-posts-panel.tsx` | Custom spinner (Loader animate-spin) | `Spinner` |
| 202 | `developer/manual-controls.tsx` | Custom card per job trigger | `Card` |
| 203 | `developer/manual-controls.tsx` | Custom spinner (Loader animate-spin) | `Spinner` |
| 204 | `developer/health-metrics.tsx` | Custom metric cards x5 | `Card`/`CardContent` |
| 205 | `developer/health-metrics.tsx` | Custom status with dynamic Tailwind (possible tree-shake issue) | `Badge` |

---

## LOW Severity (shadcn doesn't quite fit)

| # | File | Custom Pattern | Notes |
|---|------|---------------|-------|
| 206 | `home/webhook-section.tsx` | Raw `<code>` blocks for cURL/URL display | No shadcn code block component |
| 207 | `home/home-footer.tsx` | Raw `<p>` footer text | Marginal fit for `Separator` |
| 208 | `settings/settings-form.tsx` | Raw `<pre>` for .env preview | No shadcn code preview component |
| 209 | `schedule/schedule-form.tsx` | Custom error message `<p>` | Inline validation text |
| 210 | `debug/debug-publisher.tsx` | Custom section header (bg-gray-50) | Marginal fit |
| 211 | `memes/admin-meme-card.tsx` | Custom separator (border-t) | `Separator` - marginal |
| 212 | `memes/meme-submit-form.tsx` | Hidden `<input type="file">` | Needs to stay raw |
| 213 | `inbox/conversation-list.tsx` | `divide-y` on container | `Separator` - marginal |
| 214 | `inbox/message-thread.tsx` | Raw `<img>` for message attachments | Content imagery, not avatar |
| 215 | `developer/failed-posts-panel.tsx` | Custom `<pre>` for error display | No shadcn code block |
| 216 | `developer/logs-viewer.tsx` | Scrollable log area | `ScrollArea` - marginal |
| 217 | `insights/insights-dashboard.tsx` | Custom empty state (could use existing EmptyState) | Consistency issue |

---

## Summary by Component Type

| shadcn Component | Times Needed | Already Installed? |
|-----------------|-------------|-------------------|
| `Button` | ~54x | Yes |
| `Badge` | ~25x | Yes |
| `Card`/`CardHeader`/`CardContent` | ~22x | Yes |
| `Alert`/`AlertTitle`/`AlertDescription` | ~14x | Yes |
| `Input` | ~12x | Yes |
| `Label` | ~12x | Yes |
| `Spinner` | ~12x | **No - install** |
| `Skeleton` | ~9x | Yes |
| `Dialog` | ~5x (full modals) | Yes |
| `Textarea` | ~4x | Yes |
| `Avatar`/`AvatarImage`/`AvatarFallback` | ~4x | Yes |
| `Select` | ~3x | Yes |
| `Progress` | ~3x | Yes |
| `Collapsible` | ~3x | **No - install** |
| `ToggleGroup`/`Toggle` | ~3x | Yes |
| `Form`/`FormField` | ~3x | Yes |
| `ScrollArea` | ~3x | Yes |
| `AlertDialog` | ~2x | Yes |
| `Separator` | ~2x | Yes |
| `Empty` | ~2x | **No - install** |
| `Tabs` | ~1x | Yes |
| `Popover` | ~1x | Yes |
| `Drawer`/`Sheet` | ~1x | **No - install** |
| `Pagination` | ~1x | **No - install** |
| `Sonner` (wrapper) | ~1x | **No - install** |

---

## Implementation Work Packages

### WP1: Install Missing Components + Replace Core UI Primitives (Items 1-8)
**Files**: `ui/loading-spinner.tsx`, `ui/status-badge.tsx`, `ui/meme-status-badge.tsx`, `ui/media-modal.tsx`, `ui/mobile-action-sheet.tsx`, `ui/empty-state.tsx`, `ui/panel.tsx`, `ui/confirmation-dialog.tsx`
**Install**: `spinner`, `drawer`, `empty`, `collapsible`

### WP2: Home, Auth, Settings, Layout Components (Items 9-33, 159-160, 168-172)
**Files**: `layout/notification-bell.tsx`, `media/image-dimensions-badge.tsx`, `media/aspect-ratio-indicator.tsx`, `home/client-form.tsx`, `home/home-header.tsx`, `home/status-section.tsx`, `home/webhook-section.tsx`, `auth/logout-button.tsx`, `auth/connect-facebook-button.tsx`, `auth/extend-token-button.tsx`, `settings/settings-form.tsx`, `ui/theme-toggle.tsx`, `layout/theme-toggle.tsx`, `providers/toast-provider.tsx`

### WP3: Schedule + Debug + Insights Components (Items 34-85, 173-188)
**Files**: `schedule/post-list.tsx`, `schedule/schedule-manager.tsx`, `schedule/process-button.tsx`, `schedule/schedule-form.tsx`, `schedule/insights-panel.tsx`, `debug/token-info-panel.tsx`, `debug/debug-publisher.tsx`, `debug/permissions-panel.tsx`, `debug/pages-panel.tsx`, `debug/user-profile-panel.tsx`, `insights/quota-usage-card.tsx`, `insights/insights-dashboard.tsx`, `debug/debug-dashboard.tsx`

### WP4: Memes + Inbox + Developer Components (Items 86-158, 189-205)
**Files**: `memes/admin-meme-card.tsx`, `memes/meme-action-modal.tsx`, `memes/meme-search-filter.tsx`, `memes/meme-edit-modal.tsx`, `memes/meme-manager.tsx`, `memes/meme-submit-form.tsx`, `inbox/message-composer.tsx`, `inbox/conversation-list.tsx`, `inbox/inbox-manager.tsx`, `inbox/message-thread.tsx`, `developer/cron-status-panel.tsx`, `developer/stuck-locks-panel.tsx`, `developer/failed-posts-panel.tsx`, `developer/manual-controls.tsx`, `developer/logs-viewer.tsx`, `developer/health-metrics.tsx`
