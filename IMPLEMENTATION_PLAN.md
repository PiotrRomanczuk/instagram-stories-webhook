# ShortsCannon — Implementation Plan

Each task has four states:
- **Scheduled** — what to build and why
- **Implemented** `[ ]` — specific files to create or modify
- **Tested** `[ ]` — automated test cases that must pass before moving on
- **Confirmed** `[ ]` — human verification steps

Tasks are ordered by dependency. Do not start a task until all tasks it depends on are **Confirmed**.

---

## M1 — Foundation

### Infrastructure

---

#### T-M1-01 · BullMQ + Redis setup

**Scheduled**
Install `bullmq` and `ioredis`. Create a shared Redis connection factory. Replace all `node-cron` usage with BullMQ repeat jobs. Remove `node-cron` from dependencies once migration is complete.

**Implemented** `[ ]`
- `package.json` — add `bullmq`, `ioredis`; remove `node-cron`
- `lib/queue/redis.ts` — singleton `IORedis` connection, reads `REDIS_URL` from env
- `lib/queue/queues.ts` — exports all 5 named queues: `publishQueue`, `composeQueue`, `aiGenQueue`, `ingestQueue`, `analyticsQueue`
- `worker/index.ts` — entry point: imports all workers, connects to Redis, logs ready state
- `worker/workers/publish.worker.ts` — BullMQ Worker for `publish-queue`
- `worker/workers/analytics.worker.ts` — BullMQ Worker for `analytics-queue`
- `.env.example` — add `REDIS_URL=redis://localhost:6379`

**Tested** `[ ]`
- `__tests__/unit/queue/redis.test.ts`
  - connects to Redis and returns a client
  - throws on bad `REDIS_URL`
- `__tests__/integration/queue/bullmq.test.ts`
  - enqueue a job → worker picks it up → job completes
  - failed job retries up to configured limit
  - repeat job fires on schedule

**Confirmed** `[ ]`
- `docker compose up -d` starts Redis without errors
- `npm run worker:dev` starts without errors, logs "Worker ready"
- Bull Board at `localhost:3000/admin/queues` shows all 5 queues (empty)
- `redis-cli ping` → PONG

---

#### T-M1-02 · Docker Compose + Cloudflare Tunnel

**Scheduled**
Create `docker-compose.yml` with Redis (persistent) and Cloudflare tunnel. Add `cloudflared/config.yml` template. Document tunnel setup steps in `README.md`.

**Implemented** `[ ]`
- `docker-compose.yml` — `redis:7-alpine` with volume + RDB save; `cloudflare/cloudflared` with config volume
- `cloudflared/config.yml.example` — tunnel config template (replace tunnel ID + credentials)
- `scripts/setup-tunnel.sh` — one-time tunnel creation instructions

**Tested** `[ ]`
- `__tests__/integration/infra/redis-connection.test.ts`
  - app can SET and GET a key via the shared Redis client

**Confirmed** `[ ]`
- `docker compose up -d` — both containers healthy (`docker compose ps`)
- Cloudflare dashboard shows tunnel as "Healthy"
- `curl https://{your-tunnel-subdomain}.trycloudflare.com/api/health` responds from local machine

---

#### T-M1-03 · PM2 Ecosystem

**Scheduled**
Create `ecosystem.config.js` for two processes: `web` (Next.js) and `worker` (BullMQ). Configure log paths, restart policy, and env. Register with OS init system.

**Implemented** `[ ]`
- `ecosystem.config.js` — `web` and `worker` apps with log paths, restart limits, env block
- `scripts/start.sh` — `docker compose up -d && pm2 start ecosystem.config.js`
- `scripts/stop.sh` — `pm2 stop all && docker compose down`

**Tested** `[ ]`
- Manual only (PM2 is process management, not unit-testable)

**Confirmed** `[ ]`
- `pm2 start ecosystem.config.js` — both processes show `online`
- Kill the `web` process (`pm2 delete web`) → PM2 restarts it within 5 seconds
- Reboot machine → both processes start automatically via `pm2 startup`

---

#### T-M1-04 · Google Drive Integration

**Scheduled**
Install `googleapis`. Create a Google Drive service that uploads, downloads, lists, and deletes files under a root folder (`ShortsCannon/`). Use OAuth2 credentials already in the app (NextAuth Google provider). Add folder-creation logic for the defined storage layout.

**Implemented** `[ ]`
- `package.json` — add `googleapis`
- `lib/storage/drive.ts` — `DriveService` class:
  - `upload(stream, filename, mimeType, folder)` — resumable upload, returns Drive file ID
  - `download(fileId)` — returns readable stream
  - `getPublicUrl(fileId)` — returns public share link (used for platform API uploads)
  - `delete(fileId)` — trash file
  - `listFolder(folderPath)` — list files in a folder
  - `ensureFolder(path)` — create nested folders if missing
- `lib/storage/paths.ts` — constants for all folder paths (`UPLOADS`, `HOROSCOPES`, `STORIES`, etc.)
- `lib/storage/cleanup.ts` — `deleteOlderThan(folderPath, days)` — used by 14-day retention job
- `.env.example` — `GOOGLE_DRIVE_ROOT_FOLDER_ID`

**Tested** `[ ]`
- `__tests__/unit/storage/drive.test.ts` (MSW mock for Drive API)
  - `upload()` calls resumable upload endpoint, returns file ID
  - `delete()` calls trash endpoint with correct file ID
  - `getPublicUrl()` returns correct shareable link format
- `__tests__/integration/storage/drive.test.ts` (real Drive API, test folder)
  - upload a small file → file appears in Drive folder
  - download the file → contents match original
  - delete file → file no longer in folder

**Confirmed** `[ ]`
- Upload a test video via the app → appears in `ShortsCannon/uploads/` in Google Drive
- Correct folder structure exists in Drive (`uploads/`, `horoscopes/`, `stories/`, etc.)

---

#### T-M1-05 · Health Endpoint

**Scheduled**
Build `GET /api/health` returning structured JSON with Redis, queue depths, platform connection status, FFmpeg availability, Drive connectivity, and process uptime.

**Implemented** `[ ]`
- `app/api/health/route.ts` — aggregates: Redis ping, BullMQ queue counts, Supabase connectivity, FFmpeg `which` check, Drive API ping

**Tested** `[ ]`
- `__tests__/unit/api/health.test.ts`
  - returns `200` with `status: "ok"` when all dependencies are healthy
  - returns `503` with `status: "degraded"` when Redis is unreachable
  - queue depth fields are present and numeric

**Confirmed** `[ ]`
- `curl localhost:3000/api/health` returns expected JSON shape
- Stop Redis → endpoint returns `degraded` with `redis.connected: false`

---

### Authentication

---

#### T-M1-06 · Multi-Role Auth (FR-00)

**Scheduled**
Extend existing NextAuth setup to support two roles: `admin` and `client`. Admin is identified by email match against `ADMIN_EMAIL` env var. Clients are created via invite. Add `role` and `is_active` to the `users` table. Protect all routes: unauthenticated → `/login`; client accessing admin route → `403`.

**Implemented** `[ ]`
- `supabase/migrations/XXXXXX_users_roles.sql` — add `role` enum (`admin|client`), `is_active bool`, `invited_by uuid`
- `lib/auth.ts` — extend NextAuth config: add `role` to session, `jwt` callback sets role from DB
- `middleware.ts` — protect all routes except `/login`, `/api/auth/**`; check `role === 'admin'` for `/admin/**`
- `app/api/users/invite/route.ts` — admin-only: create user record with `role: client`, send invite email
- `app/login/page.tsx` — Google OAuth login button + email/password fallback

**Tested** `[ ]`
- `__tests__/unit/auth/roles.test.ts`
  - `ADMIN_EMAIL` match → session role is `admin`
  - non-admin email → session role is `client`
- `__tests__/integration/auth/middleware.test.ts`
  - unauthenticated request to `/schedule` → 302 redirect to `/login`
  - client session request to `/admin/queues` → 403
  - admin session request to `/admin/queues` → 200
- `__tests__/e2e/auth/login.spec.ts`
  - Google OAuth login flow completes, session cookie set

**Confirmed** `[ ]`
- Log in with admin email → full app accessible
- Log in with a non-admin Google account → `/admin` routes show 403
- Log out → redirected to `/login`, protected pages inaccessible

---

#### T-M1-07 · Client Invitation Flow

**Scheduled**
Admin can invite a client by email. Invited user receives an email with a one-time link. On first visit they set a password (or use Google OAuth). Client session scopes all data queries to their `owner_id`.

**Implemented** `[ ]`
- `app/admin/users/page.tsx` — user list, invite form
- `app/api/users/invite/route.ts` — create pending user, send invite via nodemailer
- `app/invite/[token]/page.tsx` — accept invite, set password
- `lib/auth-helpers.ts` — `scopeToOwner(userId)` — adds `owner_id = userId` filter to all client DB queries

**Tested** `[ ]`
- `__tests__/unit/auth/invite.test.ts`
  - invite creates a pending user record
  - invite token is single-use (second use returns 410)
  - expired token (>48h) returns 410
- `__tests__/integration/auth/scoping.test.ts`
  - client A cannot read client B's platform accounts
  - admin can read all accounts

**Confirmed** `[ ]`
- Send invite → email arrives with correct link
- Accept invite → can log in with new credentials
- Client logs in → cannot see admin user's scheduled posts

---

### Database Schema

---

#### T-M1-08 · Core Schema Migration

**Scheduled**
Create the full Supabase schema for multi-account support. Key tables: `platform_accounts` (multi-account, role: source/destination, owner_id), `scheduled_posts`, `caption_templates`, `hashtag_sets`, `job_runs`. Encrypt tokens at rest using `pgcrypto`.

**Implemented** `[ ]`
- `supabase/migrations/XXXXXX_core_schema.sql`:
  - `platform_accounts(id, owner_id, platform, account_name, role[source|destination], access_token_enc, refresh_token_enc, token_expires_at, is_active)`
  - `scheduled_posts(id, owner_id, video_drive_id, platform, caption, hashtags, scheduled_at, status[pending|processing|published|failed|missed|token_expired], platform_post_id, error_message, retry_count, idempotency_key)`
  - `caption_templates(id, owner_id, name, body, platform_overrides jsonb)`
  - `hashtag_sets(id, owner_id, name, hashtags text[])`
  - `job_runs(id, type, status, started_at, finished_at, result jsonb)`
- RLS policies: users can only read/write rows where `owner_id = auth.uid()` or `auth.jwt()->>'role' = 'admin'`

**Tested** `[ ]`
- `__tests__/integration/db/rls.test.ts`
  - user A cannot SELECT from `platform_accounts` where `owner_id = user_B_id`
  - admin can SELECT all rows

**Confirmed** `[ ]`
- Migration applies cleanly: `supabase db push`
- Supabase table editor shows all tables with correct columns
- RLS enabled on all tables (check in Supabase dashboard → Auth → Policies)

---

### Media Upload

---

#### T-M1-09 · Video Upload to Google Drive (FR-01)

**Scheduled**
Build streaming upload endpoint. File streams directly from the browser → Next.js API route → Google Drive resumable upload. Never buffered in memory. Validate MIME type and file size before starting upload. Generate thumbnail via FFmpeg after upload.

**Implemented** `[ ]`
- `app/api/uploads/route.ts` — streaming multipart handler; MIME check (allow: `video/mp4`, `video/quicktime`, `video/webm`); size check (≤1GB); streams to `DriveService.upload()`; triggers thumbnail job
- `lib/media/validate.ts` — `validateUpload(file)` — MIME + size + aspect ratio checks
- `lib/media/thumbnail.ts` — `generateThumbnail(driveFileId)` — downloads to temp, FFmpeg extracts frame at 1s, uploads thumbnail to Drive
- `app/(dashboard)/library/upload/page.tsx` — drag-drop zone, progress bar via `fetch` with `ReadableStream`
- `worker/workers/thumbnail.worker.ts` — BullMQ job: generate thumbnail after upload

**Tested** `[ ]`
- `__tests__/unit/media/validate.test.ts`
  - `video/mp4` → passes
  - `image/jpeg` → fails with `INVALID_MIME`
  - file > 1GB → fails with `FILE_TOO_LARGE`
- `__tests__/integration/uploads/upload.test.ts`
  - POST with valid MP4 → returns Drive file ID
  - POST with invalid MIME → returns 422
  - thumbnail job is enqueued after successful upload

**Confirmed** `[ ]`
- Upload a 100MB MP4 → progress bar reaches 100%, file appears in Drive `uploads/` folder
- Thumbnail appears in the Video Library card within 30 seconds
- Upload a `.exe` disguised as `.mp4` → rejected with error message

---

### Platform Connections

---

#### T-M1-10 · Meta OAuth — Multi-Account (FR-02)

**Scheduled**
Extend existing Meta OAuth to support multiple Instagram accounts per user. Each connected account gets its own row in `platform_accounts`. Token encrypted with `pgcrypto`. Auto-refresh long-lived token 7 days before expiry.

**Implemented** `[ ]`
- `app/api/auth/connect/meta/route.ts` — initiate OAuth, store `state` param with `owner_id`
- `app/api/auth/callback/meta/route.ts` — exchange code → short-lived → long-lived token; encrypt and upsert `platform_accounts`
- `lib/instagram/token.ts` — `refreshLongLivedToken(account)` — extends 60-day token; updates `token_expires_at`
- `worker/workers/token-refresh.worker.ts` — BullMQ repeat job (daily): find accounts expiring in ≤7 days, refresh them
- `app/(dashboard)/settings/platforms/page.tsx` — list connected accounts with status badges, Connect / Disconnect buttons

**Tested** `[ ]`
- `__tests__/unit/instagram/token.test.ts` (MSW)
  - `refreshLongLivedToken()` calls correct Meta endpoint
  - updates `token_expires_at` in DB
  - expired token → throws `TOKEN_REFRESH_FAILED`
- `__tests__/integration/auth/meta-oauth.test.ts`
  - callback with valid code → account row created in `platform_accounts`
  - callback with invalid code → returns 400

**Confirmed** `[ ]`
- Connect Instagram account → appears in Settings/Platforms with "Connected" badge and expiry date
- Connect a second Instagram account (horoscope page) → both appear separately
- Token refresh cron fires → `token_expires_at` updated in Supabase

---

### Publishing Engine

---

#### T-M1-11 · BullMQ Publish Worker — Instagram (FR-05)

**Scheduled**
Migrate existing Instagram publishing logic to a BullMQ worker. The `publish-queue` worker picks up jobs with `{ postId, platform, accountId }`. One job per platform per post. Idempotency key prevents double-publish. Circuit breaker pauses a platform after 3 consecutive failures.

**Implemented** `[ ]`
- `worker/workers/publish.worker.ts` — main worker:
  - fetch `scheduled_post` + `platform_account` from Supabase
  - check idempotency key (skip if already completed)
  - dispatch to platform-specific publisher
  - update status in Supabase on completion/failure
- `lib/instagram/publish.ts` — existing logic, adapted to accept `DriveService` file URL
- `lib/queue/circuit-breaker.ts` — Redis-backed counter per `{platform, accountId}`; opens after 3 failures in 10 min; auto-resets after 30 min
- `app/api/cron/process/route.ts` — BullMQ repeat job registration on startup (replaces old node-cron tick)

**Tested** `[ ]`
- `__tests__/unit/queue/circuit-breaker.test.ts`
  - 3 failures → circuit opens
  - job skipped while circuit open
  - resets after 30 min
- `__tests__/integration/publishing/instagram.test.ts` (MSW)
  - valid publish job → Instagram container created → polled → published → status `published`
  - Meta 190 error → job retried, token refreshed
  - Meta 368 error (rate limit) → job delayed 1 hour, not retried immediately

**Confirmed** `[ ]`
- Create a scheduled post for 1 minute from now → status changes `pending → processing → published` in the UI in real-time
- Force a bad token → status shows `failed` with error message
- Trigger 3 consecutive failures → Bull Board shows circuit breaker open for that platform

---

#### T-M1-12 · Real-Time Status via Supabase Realtime

**Scheduled**
Web UI subscribes to `scheduled_posts` table changes via Supabase Realtime. Status cards on the Calendar and Library update without page refresh.

**Implemented** `[ ]`
- `hooks/usePostStatus.ts` — Supabase Realtime subscription on `scheduled_posts` filtered by `owner_id`
- `app/(dashboard)/calendar/page.tsx` — consume `usePostStatus` hook; update card status inline
- `app/(dashboard)/publishing-logs/page.tsx` — live log feed

**Tested** `[ ]`
- `__tests__/unit/hooks/usePostStatus.test.ts`
  - mock Supabase channel event → hook state updates correctly

**Confirmed** `[ ]`
- Open calendar in browser → publish a post → card status updates from `pending` to `published` without refresh
- Open two browser tabs → status update in one tab reflects in the other

---

### Content Scheduling

---

#### T-M1-13 · Schedule Creation Form (FR-03)

**Scheduled**
Build the scheduling form: select video from library, pick platforms (checkboxes), write base caption, override per-platform, pick hashtag sets, set time or "post now", review variable substitution. On submit, creates N rows in `scheduled_posts` (one per platform) and enqueues N BullMQ jobs.

**Implemented** `[ ]`
- `app/(dashboard)/schedule/new/page.tsx` — multi-step form (video → platforms → captions → time → review)
- `app/api/schedule/route.ts` — POST: validate, create `scheduled_posts` rows, enqueue publish jobs
- `lib/queue/enqueue.ts` — `enqueuePublishJobs(posts[])` — bulk enqueue with correct `delay` until `scheduled_at`
- `lib/templates/substitute.ts` — `substituteVariables(template, globals, perPost)` — string replace with unknown-variable detection

**Tested** `[ ]`
- `__tests__/unit/templates/substitute.test.ts`
  - `{tiktok_handle}` replaced with global value
  - `{song}` replaced with per-post value
  - unknown variable `{foo}` returns `{ ok: false, missing: ['foo'] }`
- `__tests__/integration/schedule/create.test.ts`
  - POST with 3 platforms → 3 `scheduled_posts` rows created
  - POST with missing required variable → 422 with `missing_variables` list
  - POST with `scheduled_at` in the past → 422

**Confirmed** `[ ]`
- Schedule a video to Instagram + TikTok → 2 rows appear in calendar
- Use a template with `{song}` → form shows a text field for `{song}` before submitting
- "Post now" → jobs enqueued with zero delay, post appears published within 2 minutes

---

#### T-M1-14 · Cancel / Edit / Retry (FR-03)

**Scheduled**
Allow cancelling a pending post (removes BullMQ job + sets status `cancelled`), editing caption/time before publish, and manually retrying a failed post.

**Implemented** `[ ]`
- `app/api/schedule/[id]/route.ts`
  - PATCH: update caption/hashtags/scheduled_at; re-enqueue BullMQ job with new delay
  - DELETE: set status `cancelled`; remove job from BullMQ queue
- `app/api/schedule/[id]/retry/route.ts` — POST: reset `retry_count`, re-enqueue job

**Tested** `[ ]`
- `__tests__/integration/schedule/edit.test.ts`
  - PATCH caption → updated in DB, BullMQ job replaced
  - DELETE → status `cancelled`, BullMQ job removed
  - POST retry on `failed` post → status reset to `pending`, re-enqueued

**Confirmed** `[ ]`
- Cancel a pending post from the calendar → card disappears from calendar
- Edit a post's caption → new caption used when published
- Retry a failed post → re-appears as `pending` in UI

---

### Caption & Hashtag Templates

---

#### T-M1-15 · Template & Hashtag Set CRUD (FR-04)

**Scheduled**
Full CRUD for caption templates (with per-platform overrides) and hashtag sets. Global variables stored in user settings. Template picker in the scheduling form.

**Implemented** `[ ]`
- `app/api/templates/route.ts` — GET list, POST create
- `app/api/templates/[id]/route.ts` — GET, PATCH, DELETE
- `app/api/hashtag-sets/route.ts` — GET list, POST create
- `app/api/hashtag-sets/[id]/route.ts` — GET, PATCH, DELETE
- `app/(dashboard)/settings/templates/page.tsx` — template editor with per-platform override tabs
- `app/(dashboard)/settings/hashtags/page.tsx` — hashtag set manager

**Tested** `[ ]`
- `__tests__/integration/templates/crud.test.ts`
  - create template → appears in list
  - update template body → change persists
  - delete template → 404 on subsequent GET
  - client A cannot read client B's templates

**Confirmed** `[ ]`
- Create a template with `{song}` variable → template listed in scheduling form dropdown
- Select template → captions pre-filled in form, per-platform override tabs show correct values
- Export templates as JSON → valid JSON file downloaded

---

### Content Calendar

---

#### T-M1-16 · Week-View Calendar (FR-06)

**Scheduled**
Build week-view calendar using existing `@dnd-kit` for drag-drop. Color-coded cards per platform. Clicking an empty slot opens the schedule form pre-filled with that time. Drag a card to reschedule. Platform filter toggles. Today indicator line.

**Implemented** `[ ]`
- `app/(dashboard)/calendar/page.tsx` — week grid (7 columns × 24 time slots)
- `components/calendar/PostCard.tsx` — draggable card with platform color, status badge
- `components/calendar/PlatformFilter.tsx` — toggle buttons per platform
- `app/api/calendar/route.ts` — GET: return posts for date range, grouped by day
- `app/api/schedule/[id]/reschedule/route.ts` — PATCH: update `scheduled_at`, re-enqueue BullMQ job

**Tested** `[ ]`
- `__tests__/unit/calendar/PostCard.test.ts`
  - renders with correct platform color
  - shows "missed" badge for overdue pending posts
- `__tests__/integration/calendar/reschedule.test.ts`
  - PATCH reschedule → `scheduled_at` updated, BullMQ job replaced with new delay

**Confirmed** `[ ]`
- Scheduled posts appear as cards in correct time slots
- Drag a card to new slot → DB updates, card stays in new position after page refresh
- Platform filter: uncheck Instagram → Instagram cards hidden, others visible
- Click empty slot → schedule form opens with time pre-filled

---

### Video Library

---

#### T-M1-17 · Video Library (FR-07)

**Scheduled**
Grid view of all uploaded videos, listing Drive files from `uploads/` and `composed/`. Each card shows thumbnail, title, duration, status, and tags. Inline video preview. Filter by status and tags.

**Implemented** `[ ]`
- `app/(dashboard)/library/page.tsx` — grid with filter bar
- `components/library/VideoCard.tsx` — thumbnail, title, status badge, duration, tag chips
- `components/library/VideoPreview.tsx` — modal with `react-player` pointing to Drive stream URL
- `app/api/library/route.ts` — list Drive files with metadata from `scheduled_posts` status join
- `app/api/library/[id]/tags/route.ts` — PATCH: update tags array

**Tested** `[ ]`
- `__tests__/unit/library/VideoCard.test.ts`
  - renders thumbnail, title, duration
  - shows correct status badge color
- `__tests__/integration/library/list.test.ts`
  - GET returns files list with status derived from `scheduled_posts`
  - filter `?status=published` returns only published videos

**Confirmed** `[ ]`
- Library shows all uploaded videos with thumbnails
- Click a card → video plays inline
- Add tag "guitar" to a video → tag persists after page refresh, filter by "guitar" works

---

### Notifications

---

#### T-M1-18 · Email + In-App Notifications (FR-09)

**Scheduled**
Configure nodemailer (existing dep) with SMTP env vars. Send emails on publish failure and token expiry warning. In-app toasts via existing `sonner`. Desktop notification via PM2 on process crash.

**Implemented** `[ ]`
- `lib/notifications/email.ts` — `sendEmail({ to, subject, html })` using nodemailer; reads `SMTP_*` env vars
- `lib/notifications/templates/publish-failed.ts` — email HTML template
- `lib/notifications/templates/token-expiry.ts` — email HTML template
- `worker/workers/token-refresh.worker.ts` — on refresh failure: call `sendEmail()`
- `worker/workers/publish.worker.ts` — on final failure: call `sendEmail()`
- `ecosystem.config.js` — PM2 `post_update` hook triggers `node-notifier` desktop alert on crash

**Tested** `[ ]`
- `__tests__/unit/notifications/email.test.ts` (nodemailer mock)
  - `sendEmail()` calls transport with correct `to`, `subject`
  - missing `SMTP_HOST` → throws `EMAIL_NOT_CONFIGURED`

**Confirmed** `[ ]`
- Force a publish failure → receive failure email within 1 minute
- Token expiring in 6 days → warning email arrives next morning
- Kill the `web` process → desktop notification appears

---

### Settings

---

#### T-M1-19 · Settings Page (FR-10)

**Scheduled**
Settings page with: connected platforms, global template variables, default timezone, email notification preferences, and theme toggle.

**Implemented** `[ ]`
- `app/(dashboard)/settings/page.tsx` — tabbed layout: Platforms / Templates / Notifications / Appearance
- `app/api/settings/route.ts` — GET/PATCH user preferences stored in `user_preferences` Supabase table
- `supabase/migrations/XXXXXX_user_preferences.sql` — `user_preferences(user_id, timezone, email_on_failure, email_on_success, global_variables jsonb)`

**Tested** `[ ]`
- `__tests__/integration/settings/preferences.test.ts`
  - PATCH `{ timezone: "Europe/Warsaw" }` → persisted, returned on next GET
  - PATCH `{ global_variables: { tiktok_handle: "myhandle" } }` → used in next template substitution

**Confirmed** `[ ]`
- Set timezone → new posts scheduled via UI use selected timezone
- Set `tiktok_handle` global variable → automatically appears in `{tiktok_handle}` fields in scheduling form
- Toggle dark mode → theme persists across page refresh

---

#### T-M1-20 · Sleep/Wake Catch-Up (NFR-02)

**Scheduled**
On worker startup, query `scheduled_posts` where `status = 'pending'` and `scheduled_at < now()`. Posts missed within 2 hours → re-enqueue immediately. Posts missed more than 2 hours ago → set status `missed`, send email notification.

**Implemented** `[ ]`
- `worker/startup/catch-up.ts` — `runCatchUp()` called once when worker boots
- `app/api/notifications/missed/route.ts` — GET: list missed posts for dashboard notification banner

**Tested** `[ ]`
- `__tests__/unit/worker/catch-up.test.ts`
  - post missed 30 min ago → enqueued with 0 delay
  - post missed 3 hours ago → status set to `missed`, email triggered

**Confirmed** `[ ]`
- Schedule a post, put machine to sleep for 1 hour, wake → post publishes within 2 minutes of wake
- Schedule a post, put machine to sleep for 3 hours, wake → post shows as "missed" in dashboard with notification

---

## M2 — TikTok Dispatch

---

#### T-M2-01 · TikTok OAuth

**Scheduled**
Add TikTok OAuth flow. Separate from Meta — TikTok has its own developer app. Store access + refresh tokens in `platform_accounts`. Auto-refresh before expiry (TikTok tokens expire in 24h; refresh tokens last 365 days).

**Implemented** `[ ]`
- `app/api/auth/connect/tiktok/route.ts` — redirect to TikTok OAuth
- `app/api/auth/callback/tiktok/route.ts` — exchange code, store tokens
- `lib/tiktok/auth.ts` — `refreshTikTokToken(account)` — uses refresh token
- `worker/workers/token-refresh.worker.ts` — extend to handle TikTok 24h refresh cycle
- `.env.example` — `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

**Tested** `[ ]`
- `__tests__/unit/tiktok/auth.test.ts` (MSW)
  - token refresh with valid refresh token → new access token stored
  - expired refresh token → throws `TIKTOK_REAUTH_REQUIRED`

**Confirmed** `[ ]`
- Connect TikTok account → appears in Settings/Platforms
- 25 hours later → token auto-refreshed, still shows as "Connected"

---

#### T-M2-02 · TikTok Direct Post Publisher

**Scheduled**
Implement TikTok Content Posting API: initialize upload → chunked upload → create post with `DIRECT_POST` mode. Add TikTok case to publish worker. Handle error codes `2200004` (token expired) and `2200006` (permission denied).

**Implemented** `[ ]`
- `lib/tiktok/publish.ts` — `publishToTikTok(account, driveFileId, caption, hashtags)`:
  1. Download file from Drive to `./temp/`
  2. Initialize upload → get `upload_url`
  3. Chunk and upload
  4. Create post with `privacy_level: PUBLIC_TO_EVERYONE`, `direct_post: true`
  5. Clean up temp file
- `worker/workers/publish.worker.ts` — add `case 'tiktok'` branch

**Tested** `[ ]`
- `__tests__/unit/tiktok/publish.test.ts` (MSW)
  - full publish flow: init → upload → create post → returns `post_id`
  - `2200004` → triggers token refresh + retry
  - `2200006` → job fails with `TIKTOK_PERMISSION_DENIED`, not retried

**Confirmed** `[ ]`
- Schedule a video to TikTok → video appears on TikTok within 2 minutes
- Guitar video dispatched to TikTok + Instagram simultaneously → both post at the same scheduled time

---

#### T-M2-03 · TikTok Caption + Hashtag Handling

**Scheduled**
TikTok captions have a 2,200 character limit. Hashtags are embedded in the caption text (not a separate field like Instagram). Validate limit before enqueuing. Template substitution applies `{tiktok_handle}` and `{song}` etc.

**Implemented** `[ ]`
- `lib/tiktok/validate.ts` — `validateTikTokCaption(caption)` — checks ≤2,200 chars
- `lib/templates/substitute.ts` — TikTok platform override: merge hashtags into caption text

**Tested** `[ ]`
- `__tests__/unit/tiktok/validate.test.ts`
  - 2,200 char caption → passes
  - 2,201 chars → fails with character count

**Confirmed** `[ ]`
- Write a TikTok caption over limit → scheduling form shows character count warning before submit

---

## M3 — Marszal Pipeline

---

#### T-M3-01 · Story Ingestion Worker (FR-11)

**Scheduled**
BullMQ repeat job (every 6 hours) fetches Stories from all `source`-role Instagram accounts in `platform_accounts`. Downloads media to Google Drive `stories/{account}/{date}/`. Deduplicates by Instagram media ID.

**Implemented** `[ ]`
- `lib/instagram/story-ingest.ts` — `fetchStories(account)`: calls `GET /{ig-user-id}/stories`, downloads each image/video
- `worker/workers/ingest.worker.ts` — repeat job: iterate source accounts, call `fetchStories`, upsert `story_items` table
- `supabase/migrations/XXXXXX_story_items.sql` — `story_items(id, account_id, ig_media_id, drive_file_id, captured_at, status[new|included|skipped|archived])`
- `lib/storage/drive.ts` — extend `upload()` to accept Buffer (for downloaded story images)

**Tested** `[ ]`
- `__tests__/unit/instagram/story-ingest.test.ts` (MSW)
  - returns list of stories with correct media URLs
  - already-imported `ig_media_id` → skipped (deduplication)
- `__tests__/integration/ingest/story-worker.test.ts`
  - worker run with mock stories → `story_items` rows created in DB
  - second run with same stories → no duplicate rows

**Confirmed** `[ ]`
- Trigger manual fetch → @marszal's stories appear in Ingest Queue UI within 30 seconds
- Run ingest twice → count stays the same (deduplication working)
- Stories older than 24h → no longer fetchable from API (expected — captured on time)

---

#### T-M3-02 · Ingest Queue UI

**Scheduled**
Grid UI showing fetched stories with checkbox selection. Filter by date. Status badges (new / included / skipped / archived). Bulk select and mark actions.

**Implemented** `[ ]`
- `app/(dashboard)/ingest/page.tsx` — grid, date filter, bulk actions bar
- `components/ingest/StoryThumbnail.tsx` — checkbox, status badge, date, Drive image preview
- `app/api/ingest/route.ts` — GET: paginated story list with filters
- `app/api/ingest/[id]/route.ts` — PATCH: update status

**Tested** `[ ]`
- `__tests__/unit/ingest/StoryThumbnail.test.ts`
  - renders thumbnail with correct status badge
  - checkbox click calls onSelect callback

**Confirmed** `[ ]`
- Ingest Queue shows @marszal's stories as thumbnails
- Check 5 stories → "Compose selected" button activates
- Mark a story as "skipped" → badge updates, story filtered out of "new" view

---

#### T-M3-03 · Server-Side FFmpeg Composition (FR-12)

**Scheduled**
Replace existing `@ffmpeg/ffmpeg` (browser WASM) with server-side FFmpeg via `fluent-ffmpeg`. Composition job: download selected story images from Drive to `./temp/`, build slideshow with transitions, mix audio, export 9:16 MP4, upload to Drive `composed/`, clean up temp.

**Implemented** `[ ]`
- `package.json` — add `fluent-ffmpeg`, `@types/fluent-ffmpeg`; remove `@ffmpeg/ffmpeg`, `@ffmpeg/util`
- `lib/media/compose.ts` — `composeSlideshow({ imageFileIds, audioFileId, slideSeconds, transition, outputCap })`:
  1. Download images + audio from Drive to `./temp/{jobId}/`
  2. Build FFmpeg filter graph: `scale`, `pad`, `concat`, `crossfade`, `amix`
  3. Output `./temp/{jobId}/output.mp4`
  4. Upload to Drive `composed/` → return Drive file ID
  5. Delete `./temp/{jobId}/` recursively
- `worker/workers/compose.worker.ts` — BullMQ job wrapper; reports progress via `job.updateProgress()`
- `app/api/compose/route.ts` — POST: validate config, enqueue compose job, return `jobId`
- `app/api/compose/[jobId]/status/route.ts` — GET: return BullMQ job progress + result

**Tested** `[ ]`
- `__tests__/unit/media/compose.test.ts`
  - `composeSlideshow()` generates correct FFmpeg command string (snapshot test)
  - temp directory is cleaned up after success
  - temp directory is cleaned up after failure
- `__tests__/integration/compose/job.test.ts`
  - POST compose → job enqueued → worker completes → Drive file exists
  - invalid slide count (0) → 422

**Confirmed** `[ ]`
- Select 5 stories + audio track → trigger compose → progress bar moves to 100%
- Download composed video → plays correctly, correct duration, audio audible
- Composed video appears in Video Library
- Confirm `./temp/` is empty after job completes

---

#### T-M3-04 · Composition Config Form

**Scheduled**
Form for configuring a composition: select stories (drag-order to reorder), pick audio track, set slide duration, transition type, output cap. Preview estimated duration. Submit → enqueue compose job → show progress.

**Implemented** `[ ]`
- `app/(dashboard)/compose/new/page.tsx` — multi-step: selected stories (reorderable) → audio → settings → submit
- `components/compose/StoryOrderList.tsx` — sortable list via `@dnd-kit/sortable`
- `components/compose/AudioPicker.tsx` — browse library, preview 10s clip
- `components/compose/CompositionProgress.tsx` — polls `/api/compose/[jobId]/status` until complete

**Tested** `[ ]`
- `__tests__/unit/compose/StoryOrderList.test.ts`
  - drag item from position 2 to position 0 → order updates correctly

**Confirmed** `[ ]`
- Reorder stories via drag → order reflected in the final video
- Pick audio track → preview plays in the form
- Submit → progress bar animates, "Complete" button appears when done
- Re-compose (change audio) on an unscheduled video → new composed file replaces old one

---

#### T-M3-05 · Audio Library (FR-13)

**Scheduled**
Upload audio files to Google Drive `audio/`. Store metadata in `audio_tracks` Supabase table. Preview audio in browser. Tag, favourite, filter.

**Implemented** `[ ]`
- `supabase/migrations/XXXXXX_audio_tracks.sql` — `audio_tracks(id, owner_id, title, artist, duration_s, drive_file_id, tags text[], is_favourite)`
- `app/api/audio/route.ts` — GET list, POST upload (stream to Drive, create DB row)
- `app/api/audio/[id]/route.ts` — PATCH (tags, favourite), DELETE
- `app/(dashboard)/audio/page.tsx` — grid with preview player, tag filter, favourites toggle
- `components/audio/TrackCard.tsx` — title, duration, tags, play button, favourite star

**Tested** `[ ]`
- `__tests__/integration/audio/upload.test.ts`
  - POST MP3 → `audio_tracks` row created, Drive file exists
  - POST non-audio MIME → 422
- `__tests__/unit/audio/TrackCard.test.ts`
  - clicking play calls `onPlay` callback
  - favourite toggle calls `onFavourite` callback

**Confirmed** `[ ]`
- Upload an MP3 → appears in Audio Library with correct duration
- Click play → audio plays in browser without downloading full file
- Tag a track "lofi" → filter by "lofi" shows only that track
- Mark as favourite → appears at top of list in composition audio picker

---

## M4 — YouTube Shorts

---

#### T-M4-01 · YouTube OAuth + Token Management

**Implemented** `[ ]`
- `app/api/auth/connect/youtube/route.ts` — Google OAuth with `youtube.upload` scope
- `lib/youtube/token.ts` — refresh token handling (long-lived Google refresh tokens)
- `.env.example` — `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`

**Tested** `[ ]`
- `__tests__/unit/youtube/token.test.ts` — refresh flow via MSW mock

**Confirmed** `[ ]`
- Connect YouTube → channel name shown in Settings/Platforms

---

#### T-M4-02 · YouTube Shorts Resumable Upload + Publish

**Implemented** `[ ]`
- `lib/youtube/publish.ts` — resumable upload API; `#Shorts` appended to title if ≤60s + 9:16; `privacyStatus: public`
- `worker/workers/publish.worker.ts` — add `case 'youtube'` branch

**Tested** `[ ]`
- `__tests__/unit/youtube/publish.test.ts` (MSW)
  - video ≤60s + 9:16 → `#Shorts` in title
  - video >60s → no `#Shorts`, warning returned
  - upload completes → returns `videoId`

**Confirmed** `[ ]`
- Schedule a ≤60s 9:16 video to YouTube → appears on channel as a Short
- Video >60s → warning shown in scheduling form

---

## M5 — Meta Expansion (Facebook Reels + Threads)

---

#### T-M5-01 · Facebook Reels Publisher

**Implemented** `[ ]`
- `lib/facebook/publish.ts` — `/{page-id}/video_reels` endpoint; reuses Meta access token from Instagram account
- `worker/workers/publish.worker.ts` — add `case 'facebook_reels'`

**Tested** `[ ]`
- `__tests__/unit/facebook/publish.test.ts` (MSW) — full container → publish flow

**Confirmed** `[ ]`
- Schedule video to Facebook Reels → appears on connected Facebook Page

---

#### T-M5-02 · Threads Publisher

**Implemented** `[ ]`
- `lib/threads/publish.ts` — container → publish two-step; reuses Meta token
- `worker/workers/publish.worker.ts` — add `case 'threads'`

**Tested** `[ ]`
- `__tests__/unit/threads/publish.test.ts` (MSW) — container created, published, post ID returned

**Confirmed** `[ ]`
- Schedule video to Threads → post appears on Threads account

---

## M6 — X / Twitter

---

#### T-M6-01 · X OAuth 2.0 PKCE

**Implemented** `[ ]`
- `app/api/auth/connect/x/route.ts` — OAuth 2.0 PKCE flow; scopes: `tweet.write media.write`
- `lib/x/token.ts` — token refresh (X OAuth 2.0 refresh tokens, 6 months)
- `.env.example` — `X_CLIENT_ID`, `X_CLIENT_SECRET`

**Tested** `[ ]`
- `__tests__/unit/x/token.test.ts` — refresh flow via MSW

**Confirmed** `[ ]`
- Connect X account → handle shown in Settings/Platforms

---

#### T-M6-02 · X Chunked Video Upload + Tweet

**Implemented** `[ ]`
- `lib/x/publish.ts` — INIT → APPEND (5MB chunks) → FINALIZE → poll `processing_info` → `POST /tweets`
- Validate ≤512MB, ≤140s before uploading
- `worker/workers/publish.worker.ts` — add `case 'x'`

**Tested** `[ ]`
- `__tests__/unit/x/publish.test.ts` (MSW)
  - chunked upload sequence completes, tweet created
  - video >512MB → rejected before upload

**Confirmed** `[ ]`
- Schedule a video to X → tweet with attached video appears on timeline

---

## M7 — Snapchat Spotlight

> Conditional on Snapchat Marketing API approval. If unavailable, M7 is deferred.

---

#### T-M7-01 · Snapchat OAuth + Spotlight Publish

**Implemented** `[ ]`
- `app/api/auth/connect/snapchat/route.ts`
- `lib/snapchat/publish.ts` — upload + create Spotlight post
- `.env.example` — `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET`

**Tested** `[ ]`
- `__tests__/unit/snapchat/publish.test.ts` (MSW)

**Confirmed** `[ ]`
- Video appears in Snapchat Spotlight feed within 5 minutes of dispatch

---

## M8 — Analytics

---

#### T-M8-01 · Analytics Fetch Workers

**Scheduled**
BullMQ repeat job (every 6 hours) fetches per-post metrics from each platform API. Normalizes to common schema: `views`, `likes`, `comments`, `shares`, `reach`. Stores in `post_analytics` table.

**Implemented** `[ ]`
- `supabase/migrations/XXXXXX_post_analytics.sql` — `post_analytics(id, post_id, platform, views, likes, comments, shares, reach, fetched_at)`
- `lib/analytics/instagram.ts`, `lib/analytics/tiktok.ts`, `lib/analytics/youtube.ts`, etc.
- `worker/workers/analytics.worker.ts` — fan out fetch jobs per published post

**Tested** `[ ]`
- `__tests__/unit/analytics/normalize.test.ts`
  - Instagram insights response → normalized schema
  - TikTok stats response → normalized schema

**Confirmed** `[ ]`
- 6 hours after publishing → metrics appear on post detail page
- Analytics data visible in CSV export

---

#### T-M8-02 · Analytics Dashboard (FR-08)

**Implemented** `[ ]`
- `app/(dashboard)/analytics/page.tsx` — overview cards + charts (recharts or visx)
- Charts: posts per platform per week, engagement rate over time
- `app/api/analytics/export/route.ts` — GET: CSV download of all post metrics

**Tested** `[ ]`
- `__tests__/unit/analytics/export.test.ts`
  - CSV export contains correct headers and row count

**Confirmed** `[ ]`
- Dashboard shows real metrics for published posts
- Export CSV → opens correctly in Excel/Numbers

---

## M9 — AI Horoscope Pipeline

---

#### T-M9-01 · Claude API Text Generation (FR-14)

**Scheduled**
Install `@anthropic-ai/sdk`. Build `generateHoroscope(sign, date, tone, promptTemplate)`. Store prompt templates per sign in DB. Store generated text linked to scheduled post.

**Implemented** `[ ]`
- `package.json` — add `@anthropic-ai/sdk`
- `lib/ai/text.ts` — `generateHoroscope(sign, date, template, globals)` — calls `claude-haiku-4-5`, returns `{ text, tagline }`
- `supabase/migrations/XXXXXX_horoscope_prompts.sql` — `horoscope_prompts(sign, prompt_template, tone, last_updated)`
- `app/api/horoscope/prompts/route.ts` — GET/PATCH per sign
- `.env.example` — `ANTHROPIC_API_KEY`

**Tested** `[ ]`
- `__tests__/unit/ai/text.test.ts` (MSW mock Claude API)
  - returns `text` (80–120 words) and `tagline` (≤6 words)
  - prompt includes `{sign}`, `{date}` substituted correctly
  - API failure → retries once, then throws `AI_TEXT_FAILED`

**Confirmed** `[ ]`
- Trigger manual run for "Aries" → generated text appears in review queue within 5 seconds
- Edit the Aries prompt template → next run uses new template

---

#### T-M9-02 · ComfyUI / Flux Image Generation (FR-15)

**Scheduled**
Build image generation service with provider fallback: ComfyUI (local network) → Flux (fal.ai) → DALL-E 3. Health-check ComfyUI before each run. Store images to Drive `horoscopes/{date}/{sign}/image.jpg`.

**Implemented** `[ ]`
- `lib/ai/image.ts` — `generateImage(sign, promptTemplate)`:
  - ping `COMFYUI_URL/health` → if 200, submit workflow, poll for result
  - else → call `fal.ai` Flux API
  - else → call OpenAI DALL-E 3
  - upload result to Drive, return Drive file ID
- `lib/ai/comfyui.ts` — ComfyUI HTTP API client (submit workflow JSON, poll `/history/{promptId}`)
- `supabase/migrations/XXXXXX_horoscope_image_prompts.sql` — `horoscope_image_prompts(sign, prompt_template, style_notes)`
- `.env.example` — `COMFYUI_URL`, `FAL_API_KEY`, `OPENAI_API_KEY`

**Tested** `[ ]`
- `__tests__/unit/ai/image.test.ts` (MSW)
  - ComfyUI available → uses ComfyUI, fal.ai not called
  - ComfyUI unavailable → falls back to fal.ai
  - both unavailable → falls back to DALL-E 3
  - all unavailable → throws `IMAGE_GEN_FAILED`

**Confirmed** `[ ]`
- ComfyUI running on second PC → 12 images generated free, ~30s each
- Shut down second PC → images generated via fal.ai API
- Generated images appear in Drive `horoscopes/{today}/` folder

---

#### T-M9-03 · FFmpeg Text Overlay (FR-15)

**Scheduled**
Using `fluent-ffmpeg`: burn tagline text onto generated image. Font, size, position, colour configured per-channel (stored in DB). Outputs `final.jpg` or `final.mp4`.

**Implemented** `[ ]`
- `lib/media/overlay.ts` — `burnTextOverlay(driveFileId, tagline, styleConfig)`:
  1. Download image from Drive to temp
  2. FFmpeg `drawtext` filter with configured font/size/position/colour
  3. Upload `final.jpg` to Drive, return file ID
- `supabase/migrations/XXXXXX_channel_styles.sql` — `channel_styles(channel_id, font_family, font_size, text_color, text_position_x, text_position_y, text_background)`

**Tested** `[ ]`
- `__tests__/unit/media/overlay.test.ts`
  - generates correct FFmpeg drawtext filter string (snapshot)
  - temp files cleaned up after success and failure

**Confirmed** `[ ]`
- Trigger overlay for "Aries" → download `final.jpg` — tagline visible on image
- Change font colour to white in settings → next run uses white text

---

#### T-M9-04 · Daily Horoscope Pipeline Cron (FR-16)

**Scheduled**
BullMQ repeat job fires at 07:00 daily. Generates all 12 signs in parallel (text + image). Applies overlay. Creates 12 `scheduled_posts` rows targeting Instagram + TikTok with staggered times. All land in Review Queue.

**Implemented** `[ ]`
- `worker/workers/horoscope-pipeline.worker.ts` — orchestrator:
  1. For all 12 signs in parallel: enqueue `ai-gen-queue` jobs for text + image
  2. When all complete: enqueue 12 overlay jobs
  3. When all overlays complete: create `scheduled_posts` (staggered, `status: review`)
  4. Log run to `job_runs` table with cost estimate
- `lib/ai/cost-estimate.ts` — `estimateCost(provider, count)` — returns `{ provider, totalUsd }`
- `app/(dashboard)/horoscope/review/page.tsx` — Review Queue: 12 cards, each with text + image preview, Approve / Edit / Reject buttons
- `app/api/horoscope/review/[id]/route.ts` — PATCH: approve (→ `pending`), reject (→ `cancelled`), update text

**Tested** `[ ]`
- `__tests__/unit/ai/pipeline.test.ts`
  - 12 signs processed → 12 `scheduled_posts` created with status `review`
  - staggered times are 60 min apart
  - one sign fails image gen → that sign status `failed`, others unaffected
- `__tests__/unit/ai/cost-estimate.test.ts`
  - fal.ai, 12 images → `$0.036`
  - DALL-E 3, 12 images → `$0.48`

**Confirmed** `[ ]`
- Trigger manual pipeline run → Review Queue shows 12 cards within ~3 minutes
- Approve all → 12 posts visible in calendar, staggered by 1 hour
- Reject "Scorpio" → Scorpio card removed, other 11 proceed
- Edit "Leo" text → edited version used when published

---

#### T-M9-05 · 14-Day Retention Cleanup

**Implemented** `[ ]`
- `worker/workers/cleanup.worker.ts` — BullMQ repeat (daily 02:00): call `DriveService.deleteOlderThan('horoscopes', 14)` and `DriveService.deleteOlderThan('stories', 14)`

**Tested** `[ ]`
- `__tests__/unit/storage/cleanup.test.ts`
  - folders older than 14 days → deleted
  - folders within 14 days → untouched

**Confirmed** `[ ]`
- Check Drive `horoscopes/` folder → no folders older than 14 days
- Logs show cleanup job ran at 02:00

---

## M10 — Polish

---

#### T-M10-01 · Dark Mode

**Implemented** `[ ]`
- `next-themes` already installed — verify `ThemeProvider` wraps app
- All components use `dark:` Tailwind classes

**Confirmed** `[ ]`
- Toggle dark mode in Settings → entire UI switches, preference persists across refresh

---

#### T-M10-02 · Mobile Responsive

**Implemented** `[ ]`
- Calendar: horizontal scroll on mobile, compact card view
- Library: 2-column grid on mobile
- Schedule form: single-column stacked layout

**Confirmed** `[ ]`
- Open on iPhone (via Cloudflare Tunnel URL) → all core flows usable without horizontal overflow

---

#### T-M10-03 · Pixabay Music Integration (FR-13 stretch)

**Implemented** `[ ]`
- `app/api/audio/pixabay/route.ts` — proxy Pixabay Music API search
- `components/audio/PixabayBrowser.tsx` — search, preview, import

**Confirmed** `[ ]`
- Search "lofi" in audio picker → Pixabay results appear alongside local library
- Import a Pixabay track → downloads to Drive `audio/`, appears in library

---

#### T-M10-04 · Bull Board Auth Guard

**Implemented** `[ ]`
- `middleware.ts` — verify `role === 'admin'` for all `/admin/**` routes
- `app/admin/queues/page.tsx` — Bull Board embed

**Confirmed** `[ ]`
- Log in as client → `/admin/queues` returns 403
- Log in as admin → Bull Board shows all queues with job counts

---

## M11 — Strummy Integration

> Requires Strummy (strummy.app) to have a stable API surface. Not started until M9 is live and stable.

---

#### T-M11-01 · Multi-User Token Management

**Scheduled**
Extend `platform_accounts` to support per-user token isolation at the Strummy user level. Strummy users each have their own connected platform accounts.

**Implemented** `[ ]`
- `supabase/migrations/XXXXXX_strummy_users.sql` — link `platform_accounts` to Strummy user IDs
- `app/api/v1/dispatch/route.ts` — public API endpoint: `POST /api/v1/dispatch` with API key auth; accepts `{ videoUrl, platforms[], captions{} }`

**Tested** `[ ]`
- `__tests__/integration/api/dispatch.test.ts`
  - valid API key + valid payload → jobs enqueued for correct platform accounts
  - invalid API key → 401

**Confirmed** `[ ]`
- Call `POST /api/v1/dispatch` from Strummy → video published to correct platform

---

#### T-M11-02 · Strummy Dashboard Widget

**Scheduled**
A "Post a clip" button in Strummy's lesson page calls the dispatch API. Pre-fills caption from lesson metadata (song name, technique).

> Implementation lives in the Strummy codebase, not here. This task tracks the API contract.

**Confirmed** `[ ]`
- Open a lesson in Strummy, click "Post clip" → video published via ShortsCannon API
- Caption pre-filled with lesson song name

---

## Appendix — Dependency Order

```
T-M1-01 (Redis/BullMQ) ← T-M1-02 (Docker) ← T-M1-03 (PM2)
T-M1-04 (Drive) ← T-M1-09 (Upload) ← T-M1-17 (Library)
T-M1-06 (Auth) ← T-M1-07 (Invite) ← T-M1-08 (Schema)
T-M1-08 (Schema) ← T-M1-10 (Meta OAuth) ← T-M1-11 (Publish Engine)
T-M1-11 (Publish Engine) ← T-M1-12 (Realtime) ← T-M1-13 (Schedule Form)
T-M1-13 ← T-M1-14 (Cancel/Edit/Retry)
T-M1-15 (Templates) ← T-M1-13
T-M1-16 (Calendar) ← T-M1-11
T-M1-18 (Notifications) ← T-M1-11
T-M1-19 (Settings) ← T-M1-06

M2 (TikTok) ← T-M1-11 (Publish Engine) confirmed
M3 (Marszal) ← M2 confirmed
M4 (YouTube) ← T-M1-11 confirmed
M5 (Meta Expansion) ← T-M1-10 confirmed
M6 (X) ← T-M1-11 confirmed
M8 (Analytics) ← M2 + M4 + M5 confirmed
M9 (Horoscope) ← M2 confirmed + T-M1-03 (FFmpeg overlay)
M10 (Polish) ← M9 confirmed
M11 (Strummy) ← M9 stable + Strummy API contract agreed
```
