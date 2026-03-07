# ShortsCannon — Angular + .NET + SQL Server + Azure Learning Path

## Context

**Why:** Learn the full Microsoft enterprise stack (Angular, ASP.NET Core, SQL Server, Azure) by building a real tool you'll actually use — a personal short-form video dispatcher that publishes to 6 social media platforms.

**What it replaces:** The current instagram-stories-webhook app (Next.js/Supabase). Gradual migration — keep the old app running while building ShortsCannon, then sunset it.

**Product:** Single-user tool to upload short videos, schedule them with per-platform captions/hashtags, and auto-publish to Instagram Reels/Stories, TikTok, YouTube Shorts, Facebook Reels, X/Twitter, and Threads simultaneously.

---

## Decisions Summary

| Decision | Choice |
|----------|--------|
| App name | **ShortsCannon** |
| Frontend | Angular 19, standalone components, Angular Material, Tailwind |
| Backend | ASP.NET Core 9, Clean Architecture, CQRS + MediatR |
| Database | SQL Server (Docker: SQL Server Linux on PC, Azure SQL Edge on Mac) |
| Auth | ASP.NET Core Identity + JWT (single user) |
| Cloud | Azure (SQL Database, Blob Storage, Functions, SignalR, App Insights, Key Vault) |
| API style | REST with URL-based versioning (`/api/v1/...`) |
| API client | Auto-generated Angular services from OpenAPI/Swagger |
| Publishing | Parallel (all platforms simultaneously) |
| Logging | Serilog (structured, sinks for Console, File, Azure) |
| Templates | DB-stored with JSON import/export |
| Calendar | Week view (primary), responsive for mobile |
| Analytics | Deferred (Phase 8+, not MVP) |
| Notifications | Email (Azure Communication Services) |
| Thumbnails | Skip initially (platform auto-generate) |
| Video cap | 1GB (Instagram limit as global cap) |
| Docker | From Phase 1 (docker-compose for local dev) |
| Git | GitFlow (main, develop, feature/*, release/*, hotfix/*) |
| IDE | Visual Studio 2022 + VS Code |
| Repo | Same repo as current project, new branch `develop` |
| Learning approach | Scaffold backend + guided frontend |

---

## Solution Architecture

```
ShortsCannon/
├── src/
│   ├── ShortsCannon.API/              # ASP.NET Core 9 Web API (presentation layer)
│   │   ├── Controllers/               # API v1 controllers
│   │   ├── Middleware/                 # Auth, error handling, logging
│   │   ├── Filters/                   # Action/exception filters
│   │   └── Program.cs                 # App configuration
│   │
│   ├── ShortsCannon.Application/      # Application layer (CQRS)
│   │   ├── Commands/                  # Write operations (MediatR IRequest)
│   │   │   ├── Videos/                # UploadVideo, DeleteVideo
│   │   │   ├── Schedule/              # CreateSchedule, CancelSchedule, ReschedulePost
│   │   │   ├── Publish/               # PublishToPlatform, RetryPublish
│   │   │   ├── Platforms/             # ConnectPlatform, DisconnectPlatform, RefreshToken
│   │   │   └── Templates/            # CreateTemplate, UpdateTemplate, ImportTemplates
│   │   ├── Queries/                   # Read operations (MediatR IRequest)
│   │   │   ├── Videos/                # GetVideos, GetVideoById
│   │   │   ├── Schedule/              # GetCalendarData, GetUpcomingPosts
│   │   │   ├── Platforms/             # GetConnectedPlatforms, GetPlatformStatus
│   │   │   ├── Analytics/             # GetPostAnalytics, GetPlatformStats
│   │   │   └── Templates/            # GetTemplates, ExportTemplates
│   │   ├── DTOs/                      # Data transfer objects
│   │   ├── Validators/               # FluentValidation validators
│   │   ├── Behaviors/                # MediatR pipeline behaviors (logging, validation)
│   │   └── Mappings/                 # AutoMapper profiles
│   │
│   ├── ShortsCannon.Domain/          # Domain layer (entities, no dependencies)
│   │   ├── Entities/                  # Video, ScheduledPost, PlatformAccount, etc.
│   │   ├── Enums/                     # Platform, PostStatus, VideoStatus
│   │   ├── Interfaces/               # IPublisher, IVideoStorage, IRepository<T>
│   │   └── Events/                   # Domain events (PostPublished, PublishFailed)
│   │
│   ├── ShortsCannon.Infrastructure/   # Infrastructure layer (external concerns)
│   │   ├── Persistence/              # EF Core DbContext, migrations, configurations
│   │   ├── Publishers/               # Platform-specific publishers
│   │   │   ├── InstagramPublisher.cs
│   │   │   ├── TikTokPublisher.cs
│   │   │   ├── YouTubePublisher.cs
│   │   │   ├── FacebookPublisher.cs
│   │   │   ├── XPublisher.cs
│   │   │   └── ThreadsPublisher.cs
│   │   ├── Storage/                  # Azure Blob Storage implementation
│   │   ├── Email/                    # Azure Communication Services
│   │   ├── Auth/                     # Identity + JWT implementation
│   │   └── Logging/                  # Serilog configuration
│   │
│   └── ShortsCannon.Functions/        # Azure Functions (background jobs)
│       ├── PublishScheduledPosts.cs    # Timer trigger (every minute)
│       ├── RefreshTokens.cs           # Timer trigger (daily)
│       └── FetchAnalytics.cs          # Timer trigger (every 6 hours)
│
├── client/                            # Angular 19 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                  # Auth, interceptors, guards, services
│   │   │   ├── features/             # Feature modules
│   │   │   │   ├── dashboard/         # Home dashboard
│   │   │   │   ├── videos/            # Video library + upload
│   │   │   │   ├── calendar/          # Content calendar (week view)
│   │   │   │   ├── schedule/          # Schedule creation form
│   │   │   │   ├── platforms/         # Platform connections
│   │   │   │   ├── templates/         # Caption/hashtag templates
│   │   │   │   ├── analytics/         # Analytics dashboard (Phase 8)
│   │   │   │   └── settings/          # App settings
│   │   │   ├── shared/                # Shared components, pipes, directives
│   │   │   └── api/                   # Auto-generated API client (from Swagger)
│   │   ├── assets/
│   │   └── styles/                    # Tailwind + global styles
│   ├── angular.json
│   └── tailwind.config.js
│
├── tests/
│   ├── ShortsCannon.API.Tests/        # Integration tests
│   ├── ShortsCannon.Application.Tests/ # Unit tests (commands, queries)
│   ├── ShortsCannon.Infrastructure.Tests/ # Publisher tests
│   └── e2e/                          # Playwright E2E tests
│
├── docker/
│   ├── docker-compose.yml             # SQL Server + API + Angular + Redis
│   ├── docker-compose.override.yml    # Dev overrides
│   ├── api.Dockerfile
│   └── client.Dockerfile
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint, test, build
│       └── deploy.yml                 # Deploy to Azure
│
├── ShortsCannon.sln                   # Solution file
└── README.md
```

---

## Database Schema (SQL Server)

```sql
-- Core tables
CREATE TABLE Videos (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(2000),
    BlobPath NVARCHAR(500) NOT NULL,        -- Azure Blob Storage path
    ThumbnailPath NVARCHAR(500),
    DurationSeconds INT,
    FileSizeBytes BIGINT,
    AspectRatio NVARCHAR(10),               -- '9:16', '1:1', '16:9'
    Status TINYINT NOT NULL DEFAULT 0,      -- Draft=0, Ready=1, Archived=2
    Tags NVARCHAR(MAX),                     -- JSON array
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE PlatformAccounts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Platform TINYINT NOT NULL,              -- Instagram=0, TikTok=1, YouTube=2, Facebook=3, X=4, Threads=5
    AccountName NVARCHAR(200) NOT NULL,
    PlatformAccountId NVARCHAR(200),
    AccessToken NVARCHAR(MAX) NOT NULL,     -- Encrypted via DataProtection
    RefreshToken NVARCHAR(MAX),             -- Encrypted
    TokenExpiresAt DATETIME2,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE ScheduledPosts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VideoId UNIQUEIDENTIFIER NOT NULL REFERENCES Videos(Id),
    Platform TINYINT NOT NULL,
    Caption NVARCHAR(MAX),
    Hashtags NVARCHAR(MAX),                 -- JSON array
    ScheduledAt DATETIME2 NOT NULL,
    Status TINYINT NOT NULL DEFAULT 0,      -- Pending=0, Processing=1, Published=2, Failed=3, Cancelled=4
    PlatformPostId NVARCHAR(200),           -- Returned after publish
    ErrorMessage NVARCHAR(MAX),
    RetryCount INT NOT NULL DEFAULT 0,
    PublishedAt DATETIME2,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE CaptionTemplates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name NVARCHAR(100) NOT NULL,
    CaptionText NVARCHAR(MAX),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE HashtagSets (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name NVARCHAR(100) NOT NULL,
    Hashtags NVARCHAR(MAX) NOT NULL,        -- JSON array of hashtag strings
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE PublishingLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ScheduledPostId UNIQUEIDENTIFIER REFERENCES ScheduledPosts(Id),
    Platform TINYINT NOT NULL,
    Action NVARCHAR(50) NOT NULL,           -- Upload, Publish, Retry, Fail, TokenRefresh
    Details NVARCHAR(MAX),                  -- JSON
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE PostAnalytics (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ScheduledPostId UNIQUEIDENTIFIER NOT NULL REFERENCES ScheduledPosts(Id),
    Platform TINYINT NOT NULL,
    Views INT NOT NULL DEFAULT 0,
    Likes INT NOT NULL DEFAULT 0,
    Comments INT NOT NULL DEFAULT 0,
    Shares INT NOT NULL DEFAULT 0,
    Reach INT NOT NULL DEFAULT 0,
    EngagementRate DECIMAL(5,2),
    FetchedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes
CREATE INDEX IX_ScheduledPosts_ScheduledAt ON ScheduledPosts(ScheduledAt) WHERE Status = 0;
CREATE INDEX IX_ScheduledPosts_VideoId ON ScheduledPosts(VideoId);
CREATE INDEX IX_ScheduledPosts_Platform ON ScheduledPosts(Platform);
CREATE INDEX IX_PostAnalytics_ScheduledPostId ON PostAnalytics(ScheduledPostId);
CREATE INDEX IX_PublishingLogs_ScheduledPostId ON PublishingLogs(ScheduledPostId);
```

---

## Phase-by-Phase Learning Path

### Phase 1: Foundation + Docker (Week 1-2)

**Learn:** .NET solution structure, Clean Architecture, Angular CLI, Docker Compose

**Backend tasks:**
- Create `ShortsCannon.sln` with 4 projects (API, Application, Domain, Infrastructure)
- Install NuGet packages: MediatR, FluentValidation, AutoMapper, Serilog, Swashbuckle
- Configure EF Core with SQL Server provider
- Set up Serilog (console + file sinks)
- Add health check endpoint (`/api/v1/health`)
- Swagger/OpenAPI with API versioning (`Asp.Versioning.Http`)
- `Program.cs` with DI registration for all layers

**Frontend tasks:**
- `ng new shortscannon-client --standalone --style=scss`
- Install Angular Material, Tailwind CSS
- Create layout: sidebar navigation + top bar + content area
- Set up routing (lazy-loaded feature routes)
- Configure proxy to .NET API (`proxy.conf.json`)

**Docker:**
- `docker-compose.yml`:
  - SQL Server container (`mcr.microsoft.com/mssql/server:2022-latest` on PC, `mcr.microsoft.com/azure-sql-edge` on Mac)
  - .NET API container
  - Angular dev server (or nginx for prod)
- Docker volumes for SQL data persistence
- `.env` file for container config

**Git:**
- Initialize GitFlow: `main` -> `develop` branch
- First feature branch: `feature/foundation`

**Milestone:** `docker-compose up` -> SQL Server + API + Angular all running. Swagger UI accessible at `localhost:5001/swagger`

---

### Phase 2: Authentication (Week 3-4)

**Learn:** ASP.NET Core Identity, JWT, Angular interceptors, route guards

**Backend:**
- ASP.NET Core Identity with SQL Server store (single user seeded on first run)
- JWT generation endpoint (`POST /api/v1/auth/login`)
- Token refresh endpoint
- `[Authorize]` on all controllers
- MediatR command: `LoginCommand` -> returns JWT

**Frontend (guided — you build this):**
- Login page component (Angular Material form, email + password)
- `AuthService` — login, logout, token storage (localStorage)
- `AuthInterceptor` — attach Bearer token to all API requests
- `AuthGuard` — protect routes, redirect to login
- Auto-logout on 401

**Swagger:**
- Generate Angular API client from OpenAPI spec (`openapi-generator-cli`)
- Set up `npm run generate-api` script

**Milestone:** Login -> JWT issued -> all API calls authenticated -> Angular auto-generates API client

---

### Phase 3: Video Upload + Azure Blob (Week 5-6)

**Learn:** Azure Blob Storage, file streaming, Angular Material components

**Backend:**
- `UploadVideoCommand` (MediatR) -> validate (1GB cap, video formats) -> upload to Azure Blob -> save metadata to DB
- `GetVideosQuery` -> list with pagination, filtering
- `GetVideoByIdQuery` -> single video details
- `DeleteVideoCommand` -> soft delete + Blob cleanup
- `IVideoStorage` interface (Domain) -> `AzureBlobVideoStorage` (Infrastructure)
- SAS token generation for direct frontend uploads (large files)

**Frontend (guided):**
- Video upload component: drag-drop zone, progress bar, format validation
- Video library page: Material card grid with thumbnails, duration badges
- Video detail view with HTML5 player
- Delete confirmation dialog

**Azure:**
- Storage Account with `videos` and `thumbnails` containers
- SAS token endpoint for client-side upload of large files

**Milestone:** Upload -> stored in Azure Blob -> visible in library -> playable

---

### Phase 4: Platform Connections + Key Vault (Week 7-8)

**Learn:** OAuth 2.0 in .NET, encrypted storage, Azure Key Vault

**Backend:**
- `ConnectPlatformCommand` — initiate OAuth flow per platform
- OAuth callback endpoints (one per platform family):
  - `/api/v1/platforms/meta/callback` (Instagram + Facebook + Threads)
  - `/api/v1/platforms/google/callback` (YouTube)
  - `/api/v1/platforms/tiktok/callback`
  - `/api/v1/platforms/x/callback`
- Token encryption via ASP.NET Data Protection API
- `GetConnectedPlatformsQuery` — list connected accounts with status
- `RefreshTokenCommand` — manual token refresh
- Background token refresh (scheduled)

**Frontend (guided):**
- Settings/Platforms page: 6 platform cards
- Each card: Connect/Disconnect button, status indicator, account name, token expiry
- OAuth redirect flow handling

**Azure:**
- Key Vault for OAuth client secrets (FACEBOOK_APP_SECRET, GOOGLE_CLIENT_SECRET, etc.)
- App Service managed identity -> Key Vault access

**Milestone:** Connect Instagram (Meta OAuth) -> token stored encrypted -> status shown in UI

---

### Phase 5: Scheduling + Background Jobs (Week 9-10)

**Learn:** Azure Functions, parallel Task execution, MediatR notifications

**Backend:**
- `CreateScheduleCommand` — schedule video to N platforms (creates N `ScheduledPosts` rows)
- Per-platform caption + hashtag customization
- `GetCalendarDataQuery` — return posts for a date range (calendar endpoint)
- `CancelScheduleCommand` / `ReschedulePostCommand`
- `IPublisher` interface with 6 implementations (stub for now — real publishing in Phase 7)
- `PublishScheduledPostsFunction` (Azure Function, timer trigger every minute):
  - Query due posts -> group by video -> publish in parallel (`Task.WhenAll`)
  - Update status, log results, retry on failure

**Frontend (guided):**
- Schedule form: select video -> check platforms -> write captions -> pick date/time
- Platform selector with checkboxes
- Per-platform caption tabs (same default, customize per platform)
- Hashtag set picker (attach saved sets)
- Caption template picker

**Milestone:** Schedule a video for 3 platforms -> background job picks it up -> status updates

---

### Phase 6: Content Calendar (Week 11-13)

**Learn:** Angular CDK DragDrop, complex component composition, date handling

**Frontend (guided — most complex UI phase):**
- Week view calendar (7-day grid with time slots)
- Scheduled posts rendered as color-coded cards per platform:
  - Instagram: gradient pink/purple
  - TikTok: black
  - YouTube: red
  - Facebook: blue
  - X: dark gray
  - Threads: black/gradient
- Drag-and-drop to reschedule (Angular CDK)
- Click empty slot -> quick schedule dialog
- Click post -> edit/cancel/view details
- Platform filter toggles (show/hide specific platforms)
- Today indicator line
- Overdue post warnings (red highlight)
- Responsive: horizontal scroll on mobile

**Backend:**
- `ReschedulePostCommand` — update `ScheduledAt` (drag-drop target)
- `GetWeekDataQuery` — optimized query for calendar view
- Conflict detection (optional: warn if same platform, same time)

**Milestone:** Visual week calendar with drag-drop rescheduling across platforms

---

### Phase 7: Platform Publishing (Week 14-15)

**Learn:** HttpClientFactory, Polly resilience, platform API integration

**Implement each `IPublisher`:**

1. **InstagramPublisher** (port from current project):
   - Graph API container -> poll -> publish
   - Error codes: 190, 100, 368

2. **FacebookPublisher:**
   - Graph API `/me/videos` endpoint
   - Same Meta token as Instagram

3. **ThreadsPublisher:**
   - Threads Publishing API (container -> publish)
   - Same Meta token

4. **TikTokPublisher:**
   - Content Posting API
   - Video chunk upload -> create post

5. **YouTubePublisher:**
   - YouTube Data API v3, resumable upload
   - `#Shorts` in title for Shorts classification

6. **XPublisher:**
   - X API v2, chunked media upload
   - Create tweet with media attachment

**Cross-cutting:**
- Polly policies: retry (3x exponential backoff), circuit breaker per platform
- `PublishingLogs` audit trail for every action
- Parallel execution: `Task.WhenAll(publishers.Select(p => p.PublishAsync(...)))`
- Email notification on success/failure (Azure Communication Services)

**Milestone:** Upload a video -> schedule to all 6 -> all publish successfully

---

### Phase 8: Analytics + Application Insights (Week 16-17)

**Learn:** Chart.js, data aggregation, Azure Application Insights

**Backend:**
- Analytics fetcher services per platform (scheduled Azure Function, every 6 hours)
- `GetPostAnalyticsQuery` — per-post metrics
- `GetDashboardStatsQuery` — aggregated counts, success rates
- Application Insights integration (request tracking, dependency tracking, custom metrics)

**Frontend (guided):**
- Dashboard home: total posts (by platform), success/fail rates, recent activity
- Per-post analytics (views, likes, engagement) — click a calendar post to see stats
- Charts (ng2-charts): posts per platform per week, engagement over time
- Platform comparison cards

**Azure:**
- Application Insights resource
- Custom metrics: publishing success rate, average publish latency per platform

**Milestone:** Dashboard with charts showing real publishing data

---

### Phase 9: Real-time + Polish (Week 18-19)

**Learn:** SignalR, Redis, Angular Animations, responsive design

**Azure:**
- SignalR Service (real-time status updates during publishing)
- Redis Cache (cache calendar data, platform statuses)

**Backend:**
- SignalR hub: `PublishingHub` — push status updates as posts process
- Redis caching layer for frequently read data

**Frontend (guided):**
- Real-time toast notifications when posts publish/fail
- Publishing queue visualization (live status during bulk publish)
- Angular Animations for status transitions
- Dark mode (Angular Material theming + Tailwind dark classes)
- Mobile responsive polish (calendar, dashboard, settings)

**Milestone:** Watch posts publish in real-time, polished responsive UI

---

### Phase 10: Testing + CI/CD + Azure Deployment (Week 20-22)

**Learn:** xUnit, WebApplicationFactory, Playwright, Azure DevOps

**Backend tests:**
- xUnit + Moq: test each MediatR handler (commands and queries)
- xUnit + WireMock: test publisher services with recorded platform API responses
- Integration tests: `WebApplicationFactory<T>` with in-memory SQL Server
- FluentAssertions for readable assertions

**Frontend tests:**
- Angular component tests (Jasmine + Karma)
- Playwright E2E: login -> upload -> schedule -> verify in calendar

**CI/CD:**
- GitHub Actions workflow:
  - Trigger on push to `develop` and `release/*`
  - Steps: restore -> build -> test -> Docker build -> push to Azure Container Registry
  - Deploy to Azure App Service (staging slot -> swap to production)
- GitFlow release process: `release/1.0.0` branch -> merge to `main` + `develop`

**Milestone:** Full test suite in CI, one-click deploy to Azure

---

## Local Development Setup

### PC Workstation (64GB RAM, Windows)

```
Docker Desktop -> docker-compose.yml:
  - SQL Server 2022 Linux container (~2GB RAM)
  - Redis container (~50MB RAM)
  - .NET API container or run via Visual Studio 2022 debugger
  - Angular via `ng serve` in VS Code

IDE: Visual Studio 2022 (backend) + VS Code (frontend)
```

### MacBook Air (8GB RAM, Apple Silicon)

```
Docker Desktop -> docker-compose.yml:
  - Azure SQL Edge container (~500MB RAM, ARM-native)
  - Redis container (~50MB RAM)
  - .NET API via `dotnet run` (lighter than container)
  - Angular via `ng serve`

IDE: VS Code with C# Dev Kit (lighter than VS 2022)
```

`docker-compose.override.yml` handles per-machine differences (SQL image selection).

---

## Azure Cost (Learning Phase)

| Service | Free Tier |
|---------|-----------|
| Azure SQL Database | 32GB free |
| App Service | F1 free tier |
| Azure Functions | 1M exec/month free |
| Blob Storage | 5GB free |
| SignalR Service | 20 connections free |
| Application Insights | 5GB/month free |
| Key Vault | 10K operations free |
| Communication Services | 100 emails/day free |
| **Total** | **$0/month** |

---

## Key NuGet Packages

| Package | Purpose |
|---------|---------|
| MediatR | CQRS command/query dispatching |
| FluentValidation | Request validation |
| AutoMapper | Entity <-> DTO mapping |
| Serilog.AspNetCore | Structured logging |
| Polly | Retry, circuit breaker, resilience |
| Microsoft.EntityFrameworkCore.SqlServer | SQL Server ORM |
| Microsoft.AspNetCore.Identity | Authentication |
| Microsoft.Identity.Web | JWT validation |
| Asp.Versioning.Http | API versioning |
| Azure.Storage.Blobs | Blob storage SDK |
| Microsoft.Azure.SignalR | Real-time messaging |
| Azure.Communication.Email | Transactional email |
| Azure.Security.KeyVault.Secrets | Secret management |
| Swashbuckle.AspNetCore | OpenAPI/Swagger |
| xUnit + Moq + FluentAssertions | Testing |
| WireMock.Net | API mocking in tests |

## Key npm Packages (Angular)

| Package | Purpose |
|---------|---------|
| @angular/material | UI component library |
| @angular/cdk | Drag-drop, overlays, accessibility |
| tailwindcss | Utility-first CSS |
| @microsoft/signalr | Real-time client |
| ng2-charts + chart.js | Analytics charts |
| openapi-generator-cli | Auto-generate API client |
| @angular/animations | UI transitions |
| date-fns | Date utilities |

---

## Verification

After each phase, verify:
1. `docker-compose up` -> all services healthy
2. Swagger UI -> test endpoints manually
3. Angular app -> UI renders, connects to API
4. Run tests: `dotnet test` (backend) + `ng test` (frontend)

**End-to-end smoke test (after Phase 7):**

```
1. Login
2. Upload a 30-second video
3. Connect Instagram account
4. Schedule for 2 minutes from now
5. Watch calendar -> post appears
6. Wait -> publishing status updates in real-time
7. Check Instagram -> video posted
```

---

## Migration Strategy

### Transition from instagram-stories-webhook

1. **Phase 1-6:** Build ShortsCannon in parallel — old app stays running for daily use
2. **Phase 7:** Port Instagram publishing logic from `lib/instagram/publish.ts` to `InstagramPublisher.cs`
3. **Post Phase 7:** Switch daily workflow to ShortsCannon for Instagram
4. **Post Phase 8:** Full sunset of instagram-stories-webhook once all platforms are stable

### What carries over from the old app:
- Instagram Graph API integration patterns (container -> poll -> publish)
- Meta OAuth flow experience
- Error handling for codes 190, 100, 368
- Scheduling and cron-based processing concepts

### What's new:
- 5 additional platforms (TikTok, YouTube, Facebook, X, Threads)
- Clean Architecture with CQRS (vs Next.js API routes)
- SQL Server with EF Core (vs Supabase/PostgreSQL)
- Azure cloud services (vs Vercel)
- Angular frontend (vs React/Next.js)
- Background jobs via Azure Functions (vs Vercel Cron)
