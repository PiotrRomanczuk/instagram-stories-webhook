# ShortsCannon — Product Requirements

**Project:** Multi-platform short-form video dispatcher
**Deployment target:** Local machine, running 24/7 (no cloud hosting required)
**Status:** Active development (migrating from instagram-stories-webhook)
**Last updated:** 2026-04-25

---

## Vision

A single tool to upload one short video and dispatch it — with per-platform captions, hashtags, and timing — to every major short-form platform simultaneously. No manual re-uploading, no tab-switching, no copy-pasting captions.

It also serves as a **content repurposing pipeline**: ingest existing content from one platform (e.g. Instagram Stories from a client account), compose it into a new format (e.g. a slideshow video with background music), and dispatch the result to other platforms (e.g. TikTok).

---

## Use Cases

### UC-01: Direct Dispatch (primary)

*As a creator, I upload a video I already have and dispatch it to multiple platforms simultaneously.*

**Flow:** Upload video → write captions + pick hashtags → select platforms + schedule time → done.

### UC-02: Guitar Channel — TikTok-First, Promote Everywhere

*TikTok is the primary publishing platform for guitar content. Other platforms (Instagram Reels, Snapchat, X, Threads, Facebook Reels) are used purely to promote the TikTok channel and drive followers there.*

**YouTube is excluded from this use case** — guitar covers trigger Content ID claims, making it unreliable. YouTube may be revisited for original compositions only.

**Flow:**
1. Record a guitar video (9:16, ≤60s recommended for cross-platform compatibility)
2. Upload to the app
3. Write a base caption; auto-apply per-platform overrides from a saved template
4. Publish to TikTok immediately (or scheduled); publish to all other platforms simultaneously
5. Captions on non-TikTok platforms include a CTA: "follow on TikTok @{handle}" to funnel audience back

**Platform priority for this use case:**
| Platform | Role | Notes |
|----------|------|-------|
| TikTok | Primary — main channel | Native sound swap for covers |
| Instagram Reels | Promotional | Most overlap with TikTok audience |
| Snapchat Spotlight | Promotional | Algorithmic reach, no follower base needed |
| Threads | Promotional | Low effort, same Meta token as Instagram |
| Facebook Reels | Promotional | Older demographic, still worth covering |
| X (Twitter) | Promotional | Secondary — guitar community active there |
| YouTube Shorts | ❌ Excluded | Copyright issues with covers |

**Caption template: `guitar-promo`**
- TikTok: `{song} 🎸 #{genre}guitar #guitarcover #guitarist`
- Instagram: `{song} cover 🎸 More on TikTok 👇 #{genre}guitar`
- All others: `{song} 🎸 Follow on TikTok for more → @{tiktok_handle}`

**Future — Strummy integration:**
This dispatch capability will eventually be embedded directly into the [Strummy](https://strummy.app) guitar teacher CRM. Guitar teachers would post lesson clips and promotional content without leaving their main workflow tool. See UC-04 below.

### UC-03: Marszal Meme Pipeline (client workflow)

*Client @marszal posts large batches of meme images to Instagram Stories daily. We want to automatically download those stories, compile them into a slideshow video with royalty-free background music, and post the result to TikTok.*

**Flow:**
1. @marszal authorizes their Instagram account in the app (one-time OAuth)
2. App fetches their latest Stories via Meta Graph API (scheduled or on-demand)
3. Stories land in an **Ingest Queue** — user reviews and selects which memes to include
4. User triggers **Video Compose**: selected images → FFmpeg slideshow → add background music track → 9:16 MP4 output
5. Composed video enters the **Video Library** like any manually uploaded video
6. Schedule composed video to TikTok (and optionally other platforms)

**Key constraints:**
- @marszal must explicitly authorize the app — the app never scrapes without OAuth consent
- Stories are only accessible via API for 24h after posting, so the fetch job must run at least once daily
- Composed video must fit TikTok limits: MP4, H.264, 9:16, 3s–10min, ≤1GB
- Music must be royalty-free / cleared for commercial use on TikTok to avoid Content ID strikes

### UC-04: AI Horoscope Page (fully automated)

*A new Instagram + TikTok page publishing daily AI-generated horoscope content for all 12 zodiac signs — text, images, and short videos produced entirely by AI with zero manual input per post.*

**Flow (runs daily in review mode — user approves before publishing):**
1. Cron triggers at a configured time (e.g. 07:00 daily)
2. For each of the 12 zodiac signs:
   a. Claude Haiku generates the horoscope text (80–120 words, mystical tone)
   b. Flux API generates a 9:16 image matching the sign's visual style
   c. FFmpeg burns a **short tagline** (sign symbol + 3–5 word mood phrase) onto the image — full text goes in the caption
   d. Optionally: video gen animates the image into a 5–10s clip (off by default)
3. All 12 posts land in the **Review Queue** — user approves, edits text, or rejects each before it goes live
4. Approved posts are scheduled with staggered times (e.g. one per hour) and dispatched to **Instagram + TikTok**
5. (Future) switch to `auto` mode once output quality is trusted

**Content format options (configurable per run):**
- Static image post (default — cheapest, fastest)
- Short video / animated image (higher engagement, optional — uses video gen API)
- Instagram Story (ephemeral — good for daily horoscopes)
- Instagram Reel + TikTok Video (broadest algorithmic reach)

**AI stack:**
| Role | Tool | Notes |
|------|------|-------|
| Text generation | Claude API (Haiku — cheap, fast) | Prompt per zodiac sign + date |
| Image generation | DALL-E 3 / Flux / Stable Diffusion | Style per sign (Aries = fire, Pisces = water, etc.) |
| Video generation | Runway Gen-3 / Kling / Luma Dream Machine | Optional — for Reel format |
| Text overlay | FFmpeg `drawtext` filter | Burns caption onto image/video |
| Music (if video) | Audio Library (FR-13) | Short ambient loop per sign element |

**Sign-to-style mapping (used in image generation prompts):**
- Fire signs (Aries, Leo, Sagittarius): warm reds, golds, flames
- Earth signs (Taurus, Virgo, Capricorn): greens, browns, nature
- Air signs (Gemini, Libra, Aquarius): blues, clouds, geometric
- Water signs (Cancer, Scorpio, Pisces): deep blues, purples, ocean/moon

**Key constraints:**
- Instagram posting limit: 50 posts/24h per account — 12 posts/day is well within quota
- Image gen API costs money per generation — budget awareness needed (DALL-E 3: ~$0.04/image → $0.48/day for 12 signs)
- Video gen APIs are expensive (~$0.05–$0.50/second) — keep clips short (5–10s) or use static images by default
- Running locally means Stable Diffusion / ComfyUI can generate images for free if installed
- All generated content stored locally in `./storage/horoscopes/{date}/{sign}/`

### UC-05: Strummy Integration (future — not in scope for V1)

*The dispatch engine built here gets embedded into [Strummy](https://strummy.app) (guitar teacher CRM) so guitar teachers can publish lesson clips and promotional content without leaving their main tool.*

**Why this makes sense:**
- Strummy already has the user's practice schedule, student list, and lesson content — publishing short clips to TikTok/Instagram is a natural extension of the marketing workflow for a guitar teacher
- Teachers who grow a social following get more students, which is core Strummy value
- The dispatch logic (OAuth tokens, platform APIs, scheduling, publish queue) is entirely reusable

**Migration path:**
1. Build and stabilise the standalone dispatcher (V1 — this project)
2. Extract the core into a reusable module or internal API
3. Embed a lightweight "Post a clip" UI in Strummy's teacher dashboard
4. Strummy calls the dispatch API to publish; tokens and platform connections managed per Strummy user

**What Strummy gets:**
- "Post to all" button inside lesson/practice session screens
- Pre-filled captions from lesson metadata (song name, technique, student level)
- Scheduled posting from within the lesson calendar

**Constraint:** Strummy is multi-user (20–30 DAU). The dispatcher in V1 is single-user. Multi-user token management and per-user platform accounts must be implemented before Strummy integration.

---

## Target Platforms

| Platform | Format | API | Status |
|----------|--------|-----|--------|
| Instagram Reels | 9:16 video, ≤90s | Meta Graph API v24+ | ✅ Implemented |
| Instagram Stories | 9:16 image/video, ≤60s | Meta Graph API v24+ | ✅ Implemented |
| TikTok | 9:16 video, ≤10min | TikTok Content Posting API | 🔄 In progress |
| YouTube Shorts | 9:16 video ≤60s (Shorts badge) | YouTube Data API v3 | ⬜ Planned (UC-01, UC-03 only — excluded from UC-02 guitar covers) |
| Facebook Reels | 9:16 video | Meta Graph API (same token as IG) | ⬜ Planned |
| Threads | Text + video/image | Threads Publishing API | ⬜ Planned |
| X (Twitter) | Video tweet | X API v2 | ⬜ Planned |
| Snapchat Spotlight | 9:16 video ≤60s | Snap Kit / Marketing API | ⬜ Planned |
| Pinterest | Idea Pins (video) | Pinterest API v5 | ⬜ Stretch |
| LinkedIn | Short video post | LinkedIn Marketing API | ⬜ Stretch |

---

## Functional Requirements

### FR-00: Authentication & User Roles

The app supports up to **10 connected accounts** (own + clients), managed under two roles:

| Role | Who | Capabilities |
|------|-----|--------------|
| **Admin** | Piotr | Full access: all accounts, all pipelines, settings, Bull Board, user management |
| **Client** | e.g. @marszal | Scoped access: only their own connected account(s) and associated pipelines |

- Login via **Google OAuth** (NextAuth — already integrated) or email/password
- Admin is identified by a hardcoded email or `is_admin` flag in DB
- Client accounts are invited by admin (invite link or manually created)
- Clients can only see their own Ingest Queue, composed videos, and publishing history
- Clients cannot access settings, other accounts, or the Bull Board
- Sessions: 30-day persistent cookie, invalidated on logout
- All routes protected by middleware — unauthenticated requests redirect to `/login`
- Cloudflare Tunnel exposes the app publicly for remote access (phone, other machines) — auth is the only protection

### FR-01: Media Upload

- Upload videos up to 1GB (Instagram is the most restrictive — use as global cap)
- Accepted formats: MP4, MOV, WebM
- Accepted aspect ratios: 9:16 (primary), 1:1, 16:9 (platform-dependent)
- Auto-convert non-9:16 video to 9:16 via letterbox/crop/blur-background
- Show upload progress bar
- Store in local filesystem (`./storage/uploads/`)
- Soft-delete + cleanup after successful publish
- Video duration validation per platform before scheduling

### FR-02: Platform Connections (OAuth)

- Connect/disconnect each platform independently
- OAuth 2.0 flow per platform family:
  - Meta (Instagram + Facebook + Threads) — one token covers all three
  - Google/YouTube — own OAuth
  - TikTok — own OAuth
  - X (Twitter) — OAuth 1.0a or OAuth 2.0 PKCE
  - Snapchat — own OAuth
- Show per-platform connection status: connected / expired / disconnected
- Show token expiry date
- Auto-refresh tokens before expiry where the API supports it (Meta long-lived tokens, YouTube refresh tokens)
- Alert user when a token cannot be auto-refreshed

### FR-03: Content Scheduling

- Schedule a video to one or more platforms at once
- Per-platform caption (default shared caption, override per platform)
- Per-platform hashtag sets (saved presets + per-post overrides)
- Per-platform post time (schedule all together OR stagger by N minutes)
- Schedule at a specific datetime or "post now"
- Cancel a pending scheduled post
- Edit a pending post (time, caption, hashtags) before it publishes
- Retry a failed post manually

### FR-04: Caption & Hashtag Templates

- Save named caption templates with `{variable}` placeholders
- Save named hashtag sets (reusable across posts)
- Attach a template + hashtag set when creating a schedule
- Import/export templates as JSON
- **Variable system — two tiers:**
  - **Global variables** — set once in Settings, automatically substituted everywhere:
    - `{tiktok_handle}`, `{instagram_handle}`, `{name}` (creator name)
  - **Per-post variables** — prompted at scheduling time, unique per post:
    - `{song}`, `{artist}`, `{genre}`, `{topic}` — user fills these in the scheduling form
  - Unknown variables in a template are highlighted in the UI before the user saves the schedule
  - No conditionals or logic — plain string substitution only

### FR-05: Publishing Engine

- Background job polls every minute for due posts
- Publish all platforms for a scheduled post in parallel
- Per-platform retry with exponential backoff (3 attempts)
- Per-platform circuit breaker — pause a platform after repeated failures
- Log every publish action (upload, publish, retry, fail, token refresh) with timestamp
- Update post status in real-time: pending → processing → published / failed
- Push real-time status updates to the UI via **Supabase Realtime** (worker writes job status to DB; web subscribes to changes)

### FR-06: Content Calendar

- Week-view calendar (primary view)
- Posts rendered as color-coded cards per platform
- Click an empty slot → quick-schedule dialog
- Click a post → view details, edit, cancel
- Drag-and-drop to reschedule a post (change datetime)
- Platform filter toggles (show/hide specific platforms)
- Today indicator line
- Highlight overdue or failed posts
- Month view (secondary, read-only)

### FR-07: Video Library

- Grid view of all uploaded videos
- Video card: thumbnail, title, duration, upload date, status (draft / scheduled / published / archived)
- Preview video inline
- Filter by status, date, tags
- Tag videos for organization
- Archive a video (hide from active library but keep in storage)

### FR-08: Analytics

- Per-post metrics per platform: views, likes, comments, shares, reach, engagement rate
- Fetched automatically every 6 hours via background job
- Dashboard overview: total posts, total reach, success rate, posts by platform
- Charts: posts per platform per week, engagement trend over time
- Click a calendar post to see its analytics inline
- Export analytics to CSV

### FR-09: Notifications

- Email notification on publish success (optional, per user preference)
- Email notification on publish failure with error details
- In-app toast for real-time status changes
- Token expiry warning (7 days before, then daily)

### FR-10: Settings & Configuration

- Connected platforms management (connect / disconnect / refresh)
- Notification preferences (email on success, email on failure)
- Default timezone for scheduling
- Default hashtag set per platform
- App theme (light / dark)

---

## Content Pipeline Requirements (UC-03 + UC-04)

### FR-11: Story Ingestion

- Connect a client Instagram account via Meta OAuth (same flow as FR-02, but the account is a *source* not a *destination*)
- Fetch Stories from the connected account via `GET /{ig-user-id}/stories` (Meta Graph API)
- Background job runs every 6 hours to fetch new stories before the 24h API window closes
- On-demand fetch: user can trigger a manual pull at any time
- Each fetched story is saved to an **Ingest Queue** with: image URL, timestamp, media type, Instagram media ID
- Download and store the media file locally/in cloud so it persists beyond the 24h API window
- Ingest Queue UI: grid of story thumbnails with checkbox selection, date badge, status (new / included / skipped)
- Mark stories as included (selected for a composition), skipped, or archived
- Deduplication: never import the same Instagram media ID twice

**Permissions required on the client account:**
- `instagram_basic` — read media
- `instagram_manage_insights` — required to access story media URLs
- Client must grant these during OAuth; show which scopes are needed before redirecting

### FR-12: Video Composer

- Select N story images from the Ingest Queue to include in one video
- Configure per-composition:
  - Slide duration: seconds each image is displayed (default 2.5s, range 1–10s)
  - Transition: none / crossfade / slide (default crossfade 0.3s)
  - Output duration cap: auto (sum of slides) or fixed cap (e.g. 59s for Shorts, 3min for TikTok)
  - Music track: pick from Audio Library or "no music"
  - Music volume: 0–100% (default 70%)
  - Music fade-out: last N seconds (default 2s)
- Composing is done server-side with FFmpeg:
  1. Resize/pad each image to 1080×1920 (9:16, black bars if not exact)
  2. Build slideshow with transitions
  3. Mix audio track under the slideshow
  4. Export as MP4, H.264, AAC audio, 9:16
- Show a progress indicator while FFmpeg runs (can take 10–60s depending on slide count)
- On completion, add the video to the Video Library with auto-generated title: `{source_account}_{date}_{n}slides`
- Allow re-compose (change music or slide selection) as long as the video hasn't been scheduled

### FR-13: Audio Library

- User uploads their own royalty-free audio files (MP3, AAC, WAV, ≤50MB each)
- Each track has: title, artist (optional), duration, tags (e.g. "upbeat", "lofi", "meme")
- Tracks stored in `./storage/audio/` and reusable across compositions and horoscope videos
- Preview a track before attaching it to a composition
- Mark a track as a favourite for quick access
- Filter tracks by tag or duration
- **Built-in free music sources (stretch):** Pixabay Music API — browse and import tracks directly
- Track usage log: which compositions and horoscope runs used which track

### FR-14: AI Text Generation

- LLM-generated horoscope text per zodiac sign per day
- Configurable prompt template per sign (stored in DB, editable in UI)
- Variables available in prompt: `{sign}`, `{date}`, `{day_of_week}`, `{moon_phase}` (stretch)
- Output: short horoscope (80–120 words), tone configurable (mystical / playful / serious)
- Generated text stored in DB linked to the scheduled post — auditable and re-generatable
- Manual override: user can edit generated text before the post goes live
- Provider: Claude API (Haiku model — fast and cheap for short-form generation)
- Fallback: if API call fails, retry once; if still fails, hold the post and alert

### FR-15: AI Image & Video Generation

- Generate one image per zodiac sign per run based on a sign-specific style prompt
- Image prompt template stored in DB, editable per sign (e.g. Aries: "fiery ram, dramatic sky, cinematic, 9:16")
- Image output: 1080×1920 PNG/JPEG (9:16), saved to `./storage/horoscopes/{date}/{sign}/image.jpg`
- Provider stack (in order of preference):
  1. **Local ComfyUI on second PC** (AMD RX 7700 XT, 12GB VRAM) — free, ~20–40s/image via SDXL; called over local network HTTP API. Used when the second PC is online.
  2. **Flux via fal.ai** — ~$0.003/image, ~$0.04/day for 12 signs; fallback when second PC is off
  3. **DALL-E 3** — ~$0.04/image; fallback if fal.ai is unavailable
- The worker pings ComfyUI health endpoint before each run; falls back to API if unreachable
- AMD RX 7700 XT runs ComfyUI via DirectML (Windows) or ROCm (Linux) — no CUDA required
- Video generation (optional, off by default):
  - Animate the generated image into a 5–10s clip using Runway Gen-3, Kling, or Luma Dream Machine
  - Video output: MP4, H.264, 9:16, saved alongside the image
  - Only triggered if the target post format is Reel (not static post or Story)
- Text overlay: FFmpeg `drawtext` filter burns the horoscope caption onto the final image/video
  - Font, size, position, colour configurable per-channel
- All generated assets stored locally; DB record links post → assets

### FR-16: Automated Content Pipeline

- **Horoscope pipeline** runs on a configurable daily cron (default 07:00 local time)
- Pipeline steps per run:
  1. Generate text for all 12 signs (FR-14) — in parallel, ~5s total
  2. Generate images for all 12 signs (FR-15) — in parallel where API allows
  3. Apply text overlay via FFmpeg
  4. Create 12 scheduled posts with staggered publish times (configurable gap, default 60min apart)
  5. Posts enter the standard publishing queue (FR-05)
- **Review mode** (configurable per pipeline):
  - `auto` — posts schedule and publish without intervention
  - `review` — posts land in an approval queue; user approves/edits/rejects each before it goes live
- Pipeline run log: timestamp, sign, generated text preview, image thumbnail, publish status
- Re-run: ability to regenerate a specific sign's post if the output was poor
- Cost estimate shown before each run (based on configured providers)

---

## Infrastructure

### Process Architecture

The app runs as **two separate long-lived processes** managed by PM2:

```
┌─────────────────────────────────────────────────────────┐
│  PM2 ecosystem                                          │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐ │
│  │   web (Next.js)     │   │   worker (BullMQ)       │ │
│  │   port 3000         │   │                         │ │
│  │                     │   │  publish-queue          │ │
│  │  API routes         │   │  compose-queue          │ │
│  │  UI pages           │   │  ai-gen-queue           │ │
│  │  OAuth callbacks    │   │  ingest-queue           │ │
│  │  File uploads       │   │  analytics-queue        │ │
│  │  Enqueues jobs ───────→  Executes jobs            │ │
│  └─────────────────────┘   └─────────────────────────┘ │
│           │                          │                  │
│           └──────────┬───────────────┘                  │
│                      ↓                                  │
│              ┌───────────────┐                          │
│              │  Redis        │  job queue + pub/sub     │
│              │  (Docker)     │                          │
│              └───────────────┘                          │
└─────────────────────────────────────────────────────────┘
         │
         ↓ Supabase (remote Postgres)
         ↓ Cloudflare Tunnel → OAuth callbacks
         ↓ Platform APIs (Meta, TikTok, etc.)
         ↓ AI APIs (Claude, OpenAI, fal.ai)
```

**Why two processes:** FFmpeg composition and AI image generation are CPU/IO-bound and can take 30–120s each. Running them inside the Next.js process would block web requests. The worker process handles all background work; the web process stays responsive.

**Why BullMQ over node-cron:**
- Jobs survive process restarts (persisted in Redis)
- Built-in retry with exponential backoff per queue
- Concurrency limits per queue (e.g. max 2 FFmpeg jobs at once)
- Job progress reporting back to the UI via events
- No double-execution — Redis atomic `SET NX` on job pickup
- Bull Board UI: visual job dashboard at `localhost:3000/admin/queues`

### Job Queues

| Queue | Concurrency | Retry | Jobs |
|-------|-------------|-------|------|
| `publish-queue` | 5 | 3× exp backoff | One job per platform per scheduled post |
| `compose-queue` | 2 | 2× exp backoff | FFmpeg slideshow + audio mix |
| `ai-gen-queue` | 4 | 3× exp backoff | Text gen (Claude), image gen, video gen |
| `ingest-queue` | 1 | 2× exp backoff | Story fetch + download per account |
| `analytics-queue` | 3 | 1× | Fetch metrics from platform APIs |

**Cron triggers** (via BullMQ `repeat` option, not node-cron):
```
publish-queue      every 1 min   — pick up due scheduled posts
ingest-queue       every 6 hours — fetch new stories from connected accounts
analytics-queue    every 6 hours — refresh post metrics
ai-gen-queue       07:00 daily   — horoscope pipeline run
```

### Local Services (Docker Compose)

Only infrastructure dependencies run in Docker. The app itself runs natively for easier debugging.

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis-data:/data"]
    command: redis-server --save 60 1   # persist to disk every 60s

  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes: ["./cloudflared:/etc/cloudflared"]
    restart: unless-stopped
```

```bash
docker compose up -d      # start Redis + tunnel
npm run dev               # start web + worker in dev mode
```

### Storage — Google Drive

All persistent media is stored in **Google Drive** (5TB available). The app uses the Google Drive API v3 with a service account or OAuth token already used for YouTube/Google auth.

**Why Google Drive:**
- 5TB free (already owned)
- Accessible from any device — supports remote access use case
- No local disk management needed for media
- Files survive machine rebuilds or OS reinstalls

**Folder structure in Drive:**

```
ShortsCannon/
  uploads/               # user-uploaded source videos
  published/             # copies kept post-publish for reference
  stories/
    {account_handle}/
      {YYYY-MM-DD}/      # ingested IG story images
  composed/              # FFmpeg output (Marszal pipeline)
  horoscopes/
    {YYYY-MM-DD}/
      {sign}/
        text.json
        image.jpg
        video.mp4        # optional
        final.mp4        # with text overlay
  audio/                 # audio library tracks
  thumbnails/            # auto-generated video thumbnails

```

**Local temp only (never persisted to Drive):**
```
./temp/                  # in-progress FFmpeg work, cleared on startup
./logs/                  # Pino log files, stay local
```

**Retention policy:**
- `horoscopes/` — auto-delete folders older than **14 days** (daily cleanup job)
- `stories/` — auto-delete story images older than **14 days**
- `uploads/` — never auto-deleted; user manually archives or the file moves to `published/` after successful publish
- `composed/` — never auto-deleted; user manages manually
- `published/` — never auto-deleted; full archive

**Access pattern:**
- Uploads: streamed directly to Drive via resumable upload API (no local temp needed for uploads)
- FFmpeg composition: file downloaded from Drive to `./temp/` → FFmpeg processes → output uploaded to Drive → temp file deleted
- Publishing: file URL fetched from Drive (public link or signed URL) and passed to platform API, OR downloaded to temp and uploaded from temp depending on platform API requirements

### PM2 Ecosystem

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'web',
      script: 'node_modules/.bin/next',
      args: 'start',
      max_restarts: 10,
      restart_delay: 5000,
      env: { NODE_ENV: 'production', PORT: 3000 },
      log_file: './logs/web/combined.log',
      out_file: './logs/web/out.log',
      error_file: './logs/web/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'worker',
      script: './worker/index.ts',          // BullMQ workers entry point
      interpreter: 'node',
      interpreter_args: '--import tsx',
      max_restarts: 10,
      restart_delay: 5000,
      log_file: './logs/worker/combined.log',
    },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 startup                    # register PM2 with OS init system
pm2 save                       # persist process list across reboots
```

### Required Local Dependencies

| Dependency | Install | Where | Purpose |
|------------|---------|-------|---------|
| Node.js 22+ | `nvm install 22` | Main machine | Runtime |
| FFmpeg | `brew install ffmpeg` | Main machine | Video composition + text overlay |
| Docker Desktop | docker.com | Main machine | Runs Redis + Cloudflare tunnel |
| PM2 | `npm i -g pm2` | Main machine | Process management + auto-restart |
| ComfyUI | github.com/comfyanonymous/ComfyUI | Second PC (7700 XT) | Free image generation via SDXL |

**Second PC setup (optional but recommended for UC-04 cost savings):**
- Install ComfyUI with AMD GPU support (DirectML on Windows, ROCm on Linux)
- Enable ComfyUI API server mode: `python main.py --listen 0.0.0.0 --port 8188`
- Main machine calls `http://{second-pc-local-ip}:8188` — both on same local network
- Download SDXL base model (~6.5GB) + refiner (~6GB) to ComfyUI models directory
- `COMFYUI_URL=http://192.168.x.x:8188` in `.env.local`

---

## Non-Functional Requirements

### NFR-01: Performance
- Upload endpoint: stream directly to `./storage/uploads/` — never buffer full file in memory
- Calendar API: 4-week window query in < 500ms (Supabase index on `scheduled_at`)
- FFmpeg composition: < 60s for a 30-slide video on the host machine
- AI text generation: all 12 signs in parallel in < 10s (Claude Haiku is ~0.5s/call)
- AI image generation: all 12 signs enqueued simultaneously, total wall time depends on provider

### NFR-02: Reliability
- All background jobs persisted in Redis — survive `web` or `worker` process restart
- No double-publish: BullMQ job state machine (`waiting → active → completed/failed`) prevents re-execution
- Idempotency key per publish attempt: `{postId}:{platform}:{attemptNumber}` stored in Supabase
- Worker auto-restarts via PM2; on restart it re-registers all BullMQ repeat jobs (crons) from DB config on boot
- Stale job cleanup: jobs stuck in `active` state for > 10 minutes are automatically retried
- **Sleep/wake catch-up policy:** On worker start, query for scheduled posts with `scheduled_at` in the past:
  - Missed within the last **2 hours** → publish immediately (short nap / brief outage)
  - Missed more than **2 hours ago** → mark as `missed`, surface in UI notification, user decides whether to reschedule
- **Token expiry at publish time:** If a token is expired when the publish job executes, attempt one auto-refresh. If refresh fails: fail the job, mark all queued jobs for that platform as `token_expired`, and alert immediately (do not silently retry).

### NFR-03: Security
- Platform OAuth tokens encrypted at rest in Supabase (`pgcrypto` AES-256)
- AI API keys and OAuth secrets in `.env.local` only — never in code or logs
- Never log full tokens — mask to `{first6}...` in all log output
- Uploaded files: validate MIME type server-side (not just extension); reject anything not video/audio/image
- Bull Board (`/admin/queues`) protected behind app authentication — not publicly accessible
- Cloudflare Tunnel: only exposes port 3000; Redis and Bull Board ports are localhost-only

### NFR-04: Observability

**Structured logging (Pino):**
- JSON format to `./logs/{process}/combined.log`
- Every job lifecycle event logged: `job.enqueued`, `job.started`, `job.completed`, `job.failed`
- Every publish attempt logged with: `platform`, `postId`, `status`, `durationMs`, `error` (if any)
- Log rotation: daily, keep 30 days

**Health endpoint** `GET /api/health`:
```json
{
  "status": "ok",
  "uptime": 86400,
  "queues": {
    "publish": { "waiting": 3, "active": 1, "failed": 0 },
    "compose": { "waiting": 0, "active": 0, "failed": 0 },
    "ai-gen":  { "waiting": 0, "active": 0, "failed": 0 }
  },
  "platforms": {
    "instagram": { "connected": true, "tokenExpiresIn": "58 days" },
    "tiktok":    { "connected": true, "tokenExpiresIn": "28 days" }
  },
  "storage": { "usedGb": 12.4, "freeGb": 87.6 },
  "ffmpeg": { "available": true, "version": "6.1" },
  "redis": { "connected": true, "memoryUsedMb": 24 }
}
```

**Bull Board** at `/admin/queues`: visual dashboard for all job queues — see waiting, active, completed, failed jobs; retry failed jobs manually.

**Alerting (local):** PM2 triggers a desktop notification (`node-notifier`) when:
- A process crashes and exhausts restart attempts
- A platform publish fails after all retries
- A token expires within 7 days

### NFR-05: Email Provider
- Transactional email via **Resend** (developer-friendly, generous free tier — 3,000 emails/month)
- Used for: publish failure alerts, token expiry warnings, client invite links
- Single sender domain required; configure in Resend dashboard
- `RESEND_API_KEY` in `.env.local`

### NFR-06: Developer Experience
- `npm run dev` — starts Next.js (web) + BullMQ workers in watch mode
- `docker compose up -d` — starts Redis + Cloudflare tunnel
- `npm run test` — Vitest unit + integration tests
- `npm run worker:dev` — starts only the worker process (useful for debugging jobs)
- All secrets in `.env.local` (never committed); `.env.example` documents every required key

---

## Platform-Specific Requirements

### Instagram (Meta Graph API v24+)
- Reels: MP4, H.264, 9:16, 500MB max, 3–90s
- Stories: MP4 or JPEG, 9:16, 4GB max video, 1–60s
- Two-step publish: create container → poll for `FINISHED` status → publish
- Handle error codes: 190 (token expired), 100 (invalid param), 368 (rate limit)
- Respect `content_publishing_limit` quota (50 posts/24h per account)

### TikTok (Content Posting API)
- MP4, H.264, 9:16, 1GB max, 3s–10min
- Two-step: initialize upload → upload chunks → create post
- Handle `error_code: 2200004` (token expired), `2200006` (permission denied)
- **Direct Post only** — publishes immediately to TikTok feed, no draft step
- Privacy level: `PUBLIC_TO_EVERYONE` / `MUTUAL_FOLLOW_FRIENDS` / `SELF_ONLY`

### YouTube Shorts
- MP4, H.264, 9:16, 256GB max, ≤60s for Shorts badge (can be longer but won't appear in Shorts tab)
- Title must include `#Shorts` OR video must be ≤60s + 9:16 for Shorts classification
- Resumable upload API (required for large files)
- `status.privacyStatus`: `public` / `unlisted` / `private`

### Facebook Reels (Meta Graph API)
- MP4, 9:16, 1GB max, 3–90s
- Shares the same Meta access token as Instagram
- Separate endpoint: `/{page-id}/video_reels`
- Requires Page access (not personal profile)

### Threads (Threads Publishing API)
- Text post with optional media (image or video)
- Video: MP4, ≤300MB, ≤5min
- Same Meta token as Instagram/Facebook
- Container → publish two-step flow

### X / Twitter (API v2)
- Video: MP4, H.264, ≤512MB, ≤140s, ≤1920×1200
- Chunked media upload: INIT → APPEND (chunks) → FINALIZE → poll until processing → tweet
- Tweet text: ≤280 chars (video attachment uses ~23 chars for URL)

### Snapchat Spotlight
- MP4, 9:16, ≤3min, ≤1GB
- Snap Kit `Creative Kit` API or Snapchat Marketing API
- Note: Marketing API requires Snapchat business account approval — fallback to manual if unavailable

---

## Out of Scope (V1)

- Team accounts with shared workspaces — each client account is isolated, admin sees all
- Desktop/native app — web-only
- Audio-only posts
- Live streaming
- Stories with interactive elements (polls, stickers) — plain media only
- AI-generated captions for manually uploaded content — captions are written by the user for UC-01/UC-02/UC-03. AI generation is only used in the automated horoscope pipeline (UC-04).
- Paid promotion / ad management
- Automated hashtag research
- Cross-posting to personal Facebook profile (Page only)
- Scraping Instagram without OAuth — all Story ingestion requires explicit account authorization
- Fully automated publish without review for **manually uploaded content** (UC-01/02/03) — the user always schedules these explicitly. Automated publish without review applies only to the horoscope pipeline (UC-04) when configured in `auto` mode.
- Text overlays / filters / stickers on the **Marszal composed videos** (UC-03) — plain slideshow only in V1. FFmpeg text overlay is used in the horoscope pipeline (UC-04) only.

---

## Milestones

| # | Milestone | Description | Unblocks |
|---|-----------|-------------|---------|
| M1 | Foundation | Upload, storage, Meta OAuth, scheduling engine, content calendar | UC-01, UC-02 on Instagram |
| M2 | TikTok Dispatch | TikTok OAuth + direct video publishing | UC-01, UC-02 on TikTok — guitar channel live |
| **M3** | **Marszal Pipeline** | Story ingestion (FR-11) + Video Composer (FR-12) + Audio Library (FR-13) → TikTok | **UC-03 end-to-end** |
| M4 | YouTube Shorts | YouTube OAuth, resumable upload, Shorts classification | UC-01, UC-03 on YouTube (UC-02 excluded — copyright) |
| M5 | Meta Expansion | Facebook Reels + Threads (reuse existing Meta token) | UC-01, UC-02 on FB + Threads |
| M6 | X (Twitter) | X OAuth, chunked video upload, tweet creation | UC-01, UC-02 on X |
| M7 | Snapchat | Snapchat OAuth + Spotlight publishing (pending API access) | UC-01, UC-02 on Snapchat |
| M8 | Analytics | Per-platform metrics, dashboard charts, CSV export | Insights for all use cases |
| M9 | AI Horoscope Pipeline | Claude API text gen (FR-14), image gen (FR-15), automated pipeline cron (FR-16), review queue | UC-04 live |
| M10 | Polish | Dark mode, real-time publish queue, mobile responsive, Pixabay music integration | UX |
| M11 | Strummy Integration | Extract dispatch core into reusable module, embed in Strummy dashboard, multi-user token management | UC-05 |

**After M2:** UC-02 (guitar) is fully live — TikTok + Instagram Reels simultaneously.
**After M6:** UC-02 guitar channel covers all promotional platforms (IG, FB Reels, Threads from M5; X from M6). Snapchat follows at M7.
**M3 is the first client-value milestone** — delivers the complete Marszal workflow.
**M9 is the most technically novel milestone** — fully autonomous AI content pipeline, zero manual input.
**M11 is the long-term product vision** — dispatch capability embedded in Strummy.

---

## Open Questions

### AI Horoscope Pipeline (UC-04)
- ~~**Image gen provider:**~~ ✅ Resolved — ComfyUI on second PC (7700 XT) as primary; Flux API as fallback.
- **Video gen:** Runway/Kling/Luma are ~$0.05–0.50/s. For 12 signs × 7s = $4–42/day. ✅ Decision: static images by default; video gen only for configurable special occasions (e.g. full moon, equinox).
- ~~**Review mode default:**~~ ✅ Resolved — review mode first; `auto` later once quality is trusted.
- ~~**Multiple IG accounts:**~~ ✅ Resolved — multi-account is in scope (up to 10). Addressed in FR-00 and data model.

### Pipeline (UC-03)
- **Story fetch window:** Meta Graph API only returns active Stories (posted in last 24h). If @marszal posts in bursts, a 6-hour cron may miss some. Should we add a webhook (Instagram Mentions / Story Mention webhook) as a push trigger instead of polling?
- **TikTok Content ID:** Music used in composed videos must be royalty-free AND cleared for TikTok's Content ID system specifically — not just "free to use". Need a curated whitelist or a verified source (e.g. TikTok's own Commercial Music Library via API, or Pixabay which is CC0).
- ~~**FFmpeg hosting:**~~ ✅ Resolved — app runs locally 24/7, FFmpeg installed natively on host machine.
- **Client authorization UX:** Does @marszal log into the app directly, or does Piotr act as an admin who holds the token? If Piotr holds it, the app is single-user managing someone else's account — no multi-user auth needed, but clarify ownership.
- **Composed video review:** Before scheduling, should there be a built-in preview player so the user can watch the FFmpeg output and approve it? Required for quality control.

### Infrastructure
- ~~**Redis persistence:**~~ ✅ Decision — RDB snapshots (`--save 60 1`) are sufficient. Jobs reconstructed from Supabase on next tick if lost.
- ~~**Worker entry point:**~~ Implementation detail — `worker/index.ts` created during BullMQ setup.
- ~~**Bull Board auth:**~~ ✅ Covered by FR-00 — admin-only access, middleware protects `/admin/*`.
- ~~**Storage provider:**~~ ✅ Resolved — **Google Drive** (5TB). Local `./temp/` only for FFmpeg in-progress work.
- ~~**TikTok Direct Post vs Creator Tool:**~~ ✅ Resolved — Direct Post only.
- ~~**Caption template variables:**~~ ✅ Resolved — two tiers: global (set in Settings, always substituted) and per-post (prompted at scheduling time). Plain string substitution, no logic. See FR-04.

### Dispatch (UC-01)
- **Snapchat API access:** Snap Kit `Creative Kit` is limited; Snapchat Marketing API requires business approval. Confirm availability before committing to M7.
- **X (Twitter) API tier:** Free tier limits media uploads — check if a paid tier is required for reliable video posting.
- ~~**Storage provider:**~~ ✅ Resolved — local filesystem.
- ~~**Architecture decision:**~~ ✅ Resolved — extending existing Next.js app. .NET/Angular rewrite remains a separate learning project (ShortsCannon).
- ~~**OAuth callback tunnel:**~~ ✅ Resolved — Cloudflare Tunnel.
