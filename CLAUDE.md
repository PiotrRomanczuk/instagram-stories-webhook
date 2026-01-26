# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**instagram-stories-webhook** is a Next.js application that enables programmatic publishing and scheduling of Instagram Stories via the Meta Graph API. It integrates Google authentication, Supabase for token/post storage, and a cron-based scheduler for automated publishing.

## Common Commands

### Development
```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Build for production
npm run start            # Run production build
```

### Testing
```bash
npm run test             # Run unit tests (Vitest) once
npm run test:watch       # Run unit tests in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright E2E tests with UI
npm run test:coverage    # Generate coverage reports
```

### Linting & Quality
```bash
npm run lint             # Run ESLint checks
```

### Running Single Tests
```bash
# Unit test for a specific file (Vitest)
npx vitest __tests__/lib/some-module.test.ts

# E2E test for a specific file (Playwright)
npx playwright test tests/e2e/some-flow.spec.ts --headed
```

## Architecture Overview

### Authentication Flow
- **Primary Auth**: Google OAuth via NextAuth.js (not Facebook sign-in)
- **Setup**: `lib/auth.ts` defines NextAuth providers and callbacks
- **Middleware**: `proxy.ts` protects routes; exempts `/api/auth`, `/api/webhook`, public assets, and sign-in page
- **Session Tokens**: JWT-based with Supabase RLS JWT for frontend API calls
- **Authorization**: User roles (admin/user) checked against `email_whitelist` table; fallback to `ADMIN_EMAIL` env var

### Instagram API Integration
- **Base URL**: Graph API v24.0 from `lib/instagram/publish.ts`
- **Publishing**: Three-step process: create container → wait for ready (videos) → publish
- **Token Storage**: Stored server-side in Supabase `oauth_tokens` table (never in localStorage/cookies)
- **Account Linking**: Separate Facebook flow via `/api/auth/link-facebook` to associate Instagram accounts with user sessions

### Data Layer (Supabase PostgreSQL)
- **Key Tables**:
  - `oauth_tokens`: Stores Meta access tokens and Instagram business account IDs
  - `scheduled_posts`: Tracks stories to publish, with status (pending/processing/published/failed)
  - `email_whitelist`: User access control and role assignments
  - `meme_submissions`: User-submitted content for admin review/publishing

- **Row Level Security (RLS)**: Enabled on all tables using `auth.uid()` and custom policies
- **Type Mapping**: Database columns (snake_case) mapped to TypeScript types (camelCase) via `mapScheduledPostRow()` and similar functions in `lib/types/database.ts`

### Scheduler System
- **Cron Triggers**: Vercel Cron (production) or local cron via `node-cron` (development)
- **Entry Points**:
  - `/api/cron/process`: Main processor for scheduled posts (runs periodically)
  - `/api/cron/identity-audit`: Validates account identity consistency
- **Core Logic**: `lib/scheduler/process-service.ts` handles batch processing, token refresh, and duplicate detection
- **Processing Lock**: Prevents concurrent processing of the same post via distributed lock mechanism
- **Token Refresh**: Automatically extends short-lived tokens before expiry

### Media Processing
- **Image Validation**: Aspect ratio, dimensions, size checks in `lib/media/validator.ts`
- **Video Processing**: Transcoding and format conversion in `lib/media/video-processor.ts`
- **Cleanup**: 24-hour delay before media deletion to allow Instagram preview generation

### API Endpoint Security
- **Webhook Secret**: `/api/webhook/story` requires `Authorization` header matching `WEBHOOK_SECRET`
- **API Key Protection**: Scheduler endpoints require `API_KEY` header for external triggering
- **Session Auth**: Protected endpoints use `getServerSession()` to verify user identity
- **Input Validation**: All request bodies validated with Zod schemas from `lib/validations/`

### Frontend Architecture
- **Server Components**: Preferred for data fetching and protected content
- **Client Components**: Minimal use of `'use client'`; only for interactive UI
- **Data Fetching**: SWR for client-side caching, React Query patterns where needed
- **Styling**: Tailwind CSS + custom components in `app/components/ui/`

## Key Files & Patterns

### Request/Response Handling
- **API Routes**: Stored in `app/api/`, organized by feature (auth, webhook, schedule, memes, etc.)
- **Validation**: Use Zod schemas (`lib/validations/*.schema.ts`) and early returns for validation failure
- **Error Responses**: Standard JSON format with status codes (400 for client error, 500 for server)

### Database Queries
- Always use `supabaseAdmin` client for server-side operations (defined in `lib/config/supabase-admin.ts`)
- Handle Supabase errors explicitly; check both `error` and result presence
- Use `.single()` when expecting one row; map results using dedicated type-mapping functions
- Prefer column selection over `select('*')` for performance

### Meta API Calls
- Wrap all axios calls in try/catch; use `axios.isAxiosError()` to detect network vs API errors
- Handle specific error codes: `190` (token expired), `100` (invalid param), `368` (rate limit)
- Always mask tokens in logs: `token.slice(0, 6) + '...'`
- Cache Instagram Business Account IDs after first lookup

### Environment Variables
- **Server-Only Secrets**: Never prefix with `NEXT_PUBLIC_` (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `FB_APP_SECRET`)
- **Public URLs**: Use `NEXT_PUBLIC_` prefix (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
- **Fallbacks**: Check environment first, then config file (`data/app-config.json`)

## Testing Strategy

### Unit Tests (Vitest + MSW)
- Mock Meta API responses via `tests/mocks/handlers.ts`
- Test business logic, utilities, and API routes in isolation
- Global MSW setup in `tests/setup.ts`

### E2E Tests (Playwright)
- Test real user flows and UI interactions
- Save authentication state to bypass login in subsequent tests: `page.context().storageState({ path: 'auth.json' })`
- Configuration in `playwright.config.ts` (handles dev server startup)

## Code Standards (from .agent rules)

### General
- Prefer functional programming; avoid classes
- Follow Single Responsibility Principle (SRP); keep files <150 lines
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)
- No `any` types; use proper TypeScript inference

### Next.js & React
- Minimize `'use client'`, `useEffect`, and state mutations
- Prefer React Server Components and SSR features
- Use dynamic imports for code splitting

### Error Handling
- Use early returns and guard clauses for preconditions
- Implement custom error types for consistent handling
- Validate at system boundaries (user input, external APIs), not internal code

### Security Checklist
- Validate webhook/cron secrets on every request
- Never log full tokens; use masking
- Store tokens server-side only (Supabase or encrypted files)
- Sanitize user-provided URLs before passing to Instagram API
- Ensure all protected routes use `getServerSession()` or similar session checks

## Common Debugging Tasks

### Verify Authentication
- Visit `/debug` for real-time connection status and API insights
- Check `NEXT_PUBLIC_SUPABASE_URL` and `AUTH_GOOGLE_ID` are set
- Review email whitelist in Supabase `email_whitelist` table

### Test Publishing Flow
- Use "Quick Test Suite" on homepage (`/`) to publish a test story
- Debug dashboard at `/debug` shows token validity and permissions
- Check `/api/debug/publish` endpoint for manual publishing tests (dev only)

### Scheduled Post Issues
- Visit `/schedule` to create or view pending posts
- Check `scheduled_posts` table status (pending → processing → published)
- Review logs in `/api/cron/process` for batch operation results
- Token refresh happens automatically; check `oauth_tokens.expires_at` if posts fail

### Media Processing
- Validate aspect ratio (1:1 for square, 9:16 for vertical stories)
- Video files must be MP4/MOV; images must be JPG/PNG
- Check Supabase storage for processed media files
- Cleanup job deletes media 24 hours after processing

## Deployment Notes

- **Environment Setup**: Use `/settings` page to configure credentials via web interface
- **Security Headers**: Configured in `next.config.ts` (CSP, HSTS, X-Frame-Options, etc.)
- **Vercel Cron**: Configure in `vercel.json` for production scheduling
- **Supabase Migrations**: Located in `supabase/migrations/`; run via Supabase dashboard
