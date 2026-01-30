# Instagram Stories Webhook - Comprehensive UML Diagrams

This document contains detailed UML diagrams showing the system architecture, data flows, and key workflows.

---

## 1. ENTITY RELATIONSHIP DIAGRAM (ERD)

```plantuml
@startuml erd
!define ABSTRACT abstract
!define PRIMARY_KEY {id}

entity "next_auth.users" as users {
  * id: UUID <<PRIMARY_KEY>>
  --
  email: VARCHAR UNIQUE
  email_verified: TIMESTAMP
  name: VARCHAR
  image: VARCHAR
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

entity "allowed_users" as whitelist {
  * id: UUID <<PRIMARY_KEY>>
  --
  email: VARCHAR UNIQUE
  role: ENUM (developer|admin|user)
  display_name: VARCHAR
  added_by: UUID
  created_at: TIMESTAMP

  RLS: Admin only read/write
}

entity "linked_accounts" as fb_accounts {
  * id: UUID <<PRIMARY_KEY>>
  --
  user_id: UUID <<FK>>
  provider: VARCHAR (facebook)
  provider_account_id: VARCHAR
  access_token: VARCHAR (encrypted)
  refresh_token: VARCHAR
  expires_at: BIGINT (Unix ms)
  ig_user_id: VARCHAR
  ig_username: VARCHAR
  created_at: TIMESTAMP
  updated_at: TIMESTAMP

  RLS: Users see own only
}

entity "scheduled_posts" as posts {
  * id: VARCHAR (post_UUID) <<PRIMARY_KEY>>
  --
  url: VARCHAR
  type: ENUM (IMAGE|VIDEO)
  post_type: ENUM (STORY|FEED|REEL)
  caption: TEXT
  scheduled_time: BIGINT (Unix ms)
  status: ENUM (pending|processing|published|failed|cancelled)
  user_id: UUID <<FK>>
  error: TEXT
  ig_media_id: VARCHAR
  published_at: BIGINT
  user_tags: JSONB (array)
  processing_started_at: TIMESTAMP
  content_hash: VARCHAR (SHA-256)
  idempotency_key: VARCHAR
  meme_id: VARCHAR <<FK>>
  retry_count: INT
  created_at: BIGINT
  updated_at: TIMESTAMP
  processing_lock: TIMESTAMP
  processing_lock_id: VARCHAR

  RLS: Users see own; admins see all
  Indexes: (user_id, status), (created_at DESC), (content_hash)
}

entity "meme_submissions" as memes {
  * id: VARCHAR (meme_UUID) <<PRIMARY_KEY>>
  --
  user_id: UUID <<FK>>
  media_url: VARCHAR
  storage_path: VARCHAR
  title: VARCHAR (100)
  caption: TEXT (2200)
  status: ENUM (pending|approved|rejected|published|scheduled)
  rejection_reason: TEXT
  reviewed_by: UUID
  reviewed_at: TIMESTAMP
  published_at: TIMESTAMP
  ig_media_id: VARCHAR
  scheduled_time: BIGINT
  scheduled_post_id: VARCHAR <<FK>>
  content_hash: VARCHAR (SHA-256)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP

  RLS: Users see own; admins see all
}

entity "ai_meme_analysis" as ai_analysis {
  * id: UUID <<PRIMARY_KEY>>
  --
  user_id: UUID <<FK>>
  meme_id: VARCHAR <<FK>>
  scheduled_post_id: VARCHAR
  storage_path: VARCHAR (in ai-analysis bucket)
  file_size: INT
  media_type: VARCHAR
  analysis_results: JSONB
  created_at: TIMESTAMP
  archived_at: TIMESTAMP

  RLS: Admin only
  Note: Pro tier feature for AI analysis
}

entity "system_logs" as logs {
  * id: UUID <<PRIMARY_KEY>>
  --
  module: VARCHAR
  level: ENUM (info|warn|error|debug)
  message: VARCHAR
  context: JSONB
  error_stack: TEXT
  user_id: UUID
  ip_address: VARCHAR
  user_agent: VARCHAR
  created_at: TIMESTAMP

  Note: Audit trail and debugging
}

entity "messages" as messages {
  * id: UUID <<PRIMARY_KEY>>
  --
  user_id: UUID <<FK>>
  sender_id: UUID
  subject: VARCHAR
  body: TEXT
  read_at: TIMESTAMP
  created_at: TIMESTAMP

  Note: Internal messaging (future)
}

' Relationships
users ||--o{ whitelist : "email lookup"
users ||--o{ fb_accounts : "1:1 Facebook account"
users ||--o{ posts : "creates"
users ||--o{ memes : "submits"
users ||--o{ ai_analysis : "owns"
users ||--o{ logs : "actor"
users ||--o{ messages : "receives"

memes ||--o| posts : "scheduled as"
posts ||--o| fb_accounts : "publishes via"
posts ||--o| ai_analysis : "archived for"

fb_accounts ||--o{ posts : "token used for"

@enduml
```

---

## 2. CLASS DIAGRAM - Services & Business Logic

```plantuml
@startuml class_diagram
!theme plain
scale 1.5

' === AUTHENTICATION & AUTHORIZATION ===
package "Authentication & Authorization" {
  class NextAuthConfig {
    +providers: GoogleProvider[]
    +adapter: SupabaseAdapter
    +callbacks: Object
    --
    +signInCallback(): boolean
    +jwtCallback(token, account): Token
    +sessionCallback(session, token): Session
  }

  class AuthHelpers {
    +isAdmin(session): boolean
    +isDeveloper(session): boolean
    +requireAdmin(session): void
    +requireDeveloper(session): void
    +getUserId(session): string
    +getUserRole(session): UserRole
  }

  class AuthMiddleware {
    +matcher: string[]
    +protectedRoutes: string[]
    +publicRoutes: string[]
    +execute(request): NextResponse
  }
}

' === DATABASE SERVICES ===
package "Database Services" {
  interface IScheduledPost {
    id: string
    url: string
    type: MediaType
    status: PostStatus
    scheduledTime: number
    userId: string
  }

  class ScheduledPostService {
    -supabaseAdmin: SupabaseClient
    --
    +getScheduledPosts(userId?): Promise<ScheduledPost[]>
    +getAllScheduledPosts(): Promise<ScheduledPost[]>
    +addScheduledPost(post): Promise<ScheduledPostWithUser>
    +updateScheduledPost(id, updates): Promise<ScheduledPost>
    +deleteScheduledPost(id): Promise<boolean>
    +getPendingPosts(): Promise<ScheduledPostWithUser[]>
    +acquireProcessingLock(postId): Promise<boolean>
    +releaseProcessingLock(postId, lockId): Promise<void>
  }

  interface ILinkedAccount {
    id: string
    userId: string
    accessToken: string
    expiresAt: number
    igUserId: string
  }

  class LinkedAccountService {
    -supabaseAdmin: SupabaseClient
    --
    +getLinkedAccount(userId): Promise<LinkedAccount>
    +saveLinkedAccount(account): Promise<void>
    +getFacebookAccessToken(userId): Promise<string>
    +getInstagramUserId(userId): Promise<string>
    +refreshAccessToken(userId): Promise<void>
    +validateTokenExpiry(userId): Promise<boolean>
  }

  class MemeSubmissionService {
    -supabaseAdmin: SupabaseClient
    --
    +getMemeSubmission(id): Promise<MemeSubmission>
    +createMemeSubmission(input): Promise<MemeSubmission>
    +updateMemeSubmission(id, updates): Promise<MemeSubmission>
    +reviewMemeSubmission(id, adminId, action): Promise<MemeSubmission>
    +scheduleMeme(memeId, time): Promise<MemeSubmission>
    +deleteMemeSubmission(id): Promise<boolean>
    +checkForDuplicates(userId, contentHash): Promise<MemeSubmission>
  }

  class AllowedUserService {
    -supabaseAdmin: SupabaseClient
    --
    +isEmailAllowed(email): Promise<boolean>
    +getUserRole(email): Promise<UserRole>
    +getAllowedUsers(): Promise<AllowedUser[]>
    +addAllowedUser(email, role): Promise<AllowedUser>
    +removeAllowedUser(email): Promise<boolean>
    +updateUserRole(email, role): Promise<boolean>
  }
}

' === INSTAGRAM API SERVICES ===
package "Instagram API Services" {
  interface IMediaPublishRequest {
    url: string
    mediaType: string
    postType: string
    caption?: string
    userTags?: UserTag[]
  }

  class PublishingService {
    -retryPolicy: RetryPolicy
    -logger: Logger
    --
    +publishMedia(request): Promise<PublishResult>
    #createContainer(url, type): Promise<containerId>
    #waitForContainerReady(containerId): Promise<void>
    #publishContainer(containerId): Promise<igMediaId>
    #handlePublishError(error): PublishError
  }

  class ContainerService {
    -maxAttempts: number = 30
    -delayMs: number = 2000
    --
    +checkStatus(containerId): Promise<ContainerStatus>
    +waitForReady(containerId): Promise<void>
  }

  class QuotaService {
    +getContentPublishingLimit(igUserId): Promise<QuotaInfo>
    +getRemainingQuota(igUserId): Promise<number>
    +hasQuotaAvailable(igUserId): Promise<boolean>
  }

  class InsightsService {
    +getMediaInsights(igMediaId, postType): Promise<Insight[]>
    +getMetricsForStory(igMediaId): Promise<StoryMetrics>
    +getMetricsForFeed(igMediaId): Promise<FeedMetrics>
  }

  class AccountService {
    +getInstagramUsername(igUserId): Promise<string>
    +validateAccountAccess(igUserId, token): Promise<boolean>
  }
}

' === SCHEDULER & PROCESSING ===
package "Scheduler & Processing" {
  class ProcessingService {
    -lockService: LockService
    -publishingService: PublishingService
    -duplicateDetection: DuplicateDetectionService
    --
    +processScheduledPosts(postId?): Promise<BatchResult>
    #processSinglePost(post): Promise<ProcessResult>
    #validatePostBeforePublish(post): Promise<ValidationResult>
    #handlePublishSuccess(post, igMediaId): Promise<void>
    #handlePublishFailure(post, error): Promise<void>
  }

  class LockService {
    -lockDuration: number = 1800000
    --
    +acquireLock(postId): Promise<boolean>
    +releaseLock(postId, lockId): Promise<void>
    +isLockStale(lockTime): boolean
  }

  class DuplicateDetectionService {
    +generateContentHash(url): Promise<string>
    +checkForRecentPublish(hash, userId): Promise<boolean>
    +isMemeAlreadyScheduled(memeId): Promise<boolean>
    +findDuplicateSubmission(userId, hash): Promise<MemeSubmission>
  }

  class CleanupService {
    -storageClient: SupabaseStorageClient
    -retentionHours: number = 24
    --
    +cleanupOldMedia(): Promise<void>
    #deleteStorageFile(path): Promise<void>
  }

  class IdentityAuditService {
    +auditUserAccounts(): Promise<AuditResult>
    #validateTokens(): Promise<InvalidToken[]>
    #validateInstagramAccess(): Promise<InvalidAccount[]>
  }
}

' === MEDIA PROCESSING ===
package "Media Processing" {
  class MediaValidator {
    +validateForStories(dimensions): ValidationResult
    +analyzeAspectRatio(width, height): AspectRatioInfo
    #checkIdealDimensions(ratio): boolean
  }

  class VideoProcessor {
    +transcodeVideo(input): Promise<output>
    +detectVideoCodec(file): Promise<Codec>
    #encodeToMP4(input): Promise<output>
  }

  class PHashService {
    +generateImageHash(url): Promise<string>
    +compareSimilarity(hash1, hash2): number
  }

  class ServerValidator {
    +validateMediaFile(url): Promise<FileInfo>
    +getMediaDimensions(url): Promise<Dimensions>
  }
}

' === UTILITY SERVICES ===
package "Utility Services" {
  class RetryService {
    -maxRetries: number
    -baseDelay: number
    --
    +withRetry(fn, options?): Promise<T>
    #calculateBackoff(attempt): number
    #isRetryableError(error): boolean
  }

  class LoggerService {
    +info(module, message, context?): Promise<void>
    +warn(module, message, error?): Promise<void>
    +error(module, message, error?): Promise<void>
    +debug(module, message, context?): Promise<void>
  }

  class CryptoService {
    +createSignedState(payload, secret): string
    +verifySignedState(state, secret): Object | null
    +generateIdempotencyKey(): string
  }

  class NotificationService {
    +createNotification(userId, type, message): Promise<void>
    +sendEmailNotification(email, subject, body): Promise<void>
  }

  class MemeArchiverService {
    +saveMemeForAnalysis(memeId, postId, url): Promise<void>
    #downloadMediaFile(url): Promise<Buffer>
    #uploadToAnalysisBucket(buffer): Promise<path>
  }
}

' === VALIDATIONS ===
package "Validation Schemas" {
  class MemeValidationSchemas {
    +submitMemeSchema: ZodSchema
    +reviewMemeSchema: ZodSchema
    +schedulePostSchema: ZodSchema
  }

  class AuthValidationSchemas {
    +linkFacebookSchema: ZodSchema
    +extendTokenSchema: ZodSchema
  }
}

' === RELATIONSHIPS ===
ScheduledPostService --> IScheduledPost: manages
ScheduledPostService --> LockService: uses
ScheduledPostService --> DuplicateDetectionService: uses

LinkedAccountService --> ILinkedAccount: manages
LinkedAccountService --> RetryService: uses token refresh

ProcessingService --> ScheduledPostService: queries
ProcessingService --> PublishingService: delegates
ProcessingService --> DuplicateDetectionService: validates
ProcessingService --> LockService: manages locks
ProcessingService --> LoggerService: logs

PublishingService --> ContainerService: uses
PublishingService --> LinkedAccountService: gets tokens
PublishingService --> RetryService: retries failures

MemeSubmissionService --> DuplicateDetectionService: checks dupes
MemeSubmissionService --> ScheduledPostService: creates post
MemeSubmissionService --> LoggerService: logs

AllowedUserService --> AuthMiddleware: validates whitelist

AuthHelpers --> NextAuthConfig: reads session

ProcessingService --> CleanupService: triggers cleanup
ProcessingService --> MemeArchiverService: archives published

AuthMiddleware --> AuthHelpers: authorization checks

@enduml
```

---

## 3. SEQUENCE DIAGRAM - Meme Submission to Publishing

```plantuml
@startuml sequence_meme_to_publish
participant User
participant "POST /api/memes" as SubmitAPI
participant MemeService as "MemeSubmissionService"
participant DupService as "DuplicateDetectionService"
participant Supabase
participant "GET /api/admin/memes/[id]/approve" as ReviewAPI
participant "POST /api/cron/process" as CronAPI
participant ProcessService as "ProcessingService"
participant PublishService as "PublishingService"
participant FacebookAPI as "Meta Graph API"
participant Logger

User -> SubmitAPI: 1. POST {caption, title, media_url}
SubmitAPI -> MemeService: 2. createMemeSubmission(input)
MemeService -> DupService: 3. generateContentHash(url)
DupService -> Logger: 4. log('Generating hash for: ' + url.slice(0, 20))
DupService --> MemeService: 5. return contentHash
MemeService -> DupService: 6. checkForRecentPublish(hash, userId)
DupService -> Supabase: 7. query published memes (24h, same hash)
Supabase --> DupService: 8. [] (no duplicates)
DupService --> MemeService: 9. return false (not duplicate)
MemeService -> Supabase: 10. INSERT meme_submissions\n{user_id, media_url, caption, status='pending', content_hash}
Supabase --> MemeService: 11. return MemeSubmission{id, user_id, status}
MemeService --> SubmitAPI: 12. return MemeSubmission
SubmitAPI --> User: 13. {id, status='pending'} 200 OK

note over Logger
  Log: "Meme submitted by user@example.com"
end note

User -> ReviewAPI: 14. PATCH /api/admin/memes/[id]/review\n{action: 'schedule', scheduled_for: future_time}
ReviewAPI -> MemeService: 15. reviewMemeSubmission(memeId, adminId, 'schedule', time)
MemeService -> Supabase: 16. UPDATE meme_submissions\n{status='scheduled', scheduled_time, scheduled_post_id}
Supabase --> MemeService: 17. return updated meme

note over MemeService
  Also creates scheduled_posts entry:
  {url, type='IMAGE', post_type='STORY',
   caption, scheduled_time, status='pending'}
end note

MemeService -> Supabase: 18. INSERT scheduled_posts\n{url, type, caption, scheduled_time, status='pending'}
Supabase --> MemeService: 19. return ScheduledPost{id}
MemeService --> ReviewAPI: 20. return {meme, scheduledPost}
ReviewAPI --> User: 21. 200 OK

note over Logger
  Log: "Meme scheduled for publishing at [time]"
end note

... Time passes - scheduled_time <= NOW() ...

CronAPI -> ProcessService: 1. processScheduledPosts()
ProcessService -> Supabase: 2. SELECT scheduled_posts\nWHERE status='pending' AND scheduled_time <= NOW()
Supabase --> ProcessService: 3. return [ScheduledPost...]

ProcessService -> LockService: 4. acquireProcessingLock(postId)
LockService -> Supabase: 5. UPDATE scheduled_posts\nSET processing_lock=NOW(), processing_lock_id=uuid
Supabase --> LockService: 6. return success
LockService --> ProcessService: 7. return true (lock acquired)

ProcessService -> DupService: 8. checkForRecentPublish(contentHash, userId)
DupService -> Supabase: 9. query recently published by same user
Supabase --> DupService: 10. return any duplicates
DupService --> ProcessService: 11. return false (no recent dupe)

ProcessService -> PublishService: 12. publishMedia(url, type, postType, caption, userId)
PublishService -> LinkedAccountService: 13. getFacebookAccessToken(userId)
LinkedAccountService -> Supabase: 14. SELECT linked_accounts WHERE user_id=?
Supabase --> LinkedAccountService: 15. return {accessToken, igUserId, expiresAt}
LinkedAccountService --> PublishService: 16. return accessToken (decrypted)

PublishService -> FacebookAPI: 17. POST /v21.0/{igUserId}/media\n{image_url, caption, ...}
FacebookAPI --> PublishService: 18. {id: containerId}

PublishService -> PublishService: 19. waitForContainerReady(containerId)\n[Poll 30x with 2s delays]
PublishService -> FacebookAPI: 20. GET /v21.0/{containerId}?fields=status_code
FacebookAPI --> PublishService: 21. {status_code: 'FINISHED'}

PublishService -> FacebookAPI: 22. POST /v21.0/{igUserId}/media_publish\n{creation_id: containerId}
FacebookAPI --> PublishService: 23. {id: igMediaId}

PublishService --> ProcessService: 24. return {success, igMediaId}

ProcessService -> Supabase: 25. UPDATE scheduled_posts\nSET status='published', ig_media_id, published_at=NOW()
Supabase --> ProcessService: 26. return success

ProcessService -> Supabase: 27. UPDATE meme_submissions\nSET status='published', ig_media_id, published_at
Supabase --> ProcessService: 28. return success

ProcessService -> MemeArchiverService: 29. saveMemeForAnalysis(memeId, postId, url)
MemeArchiverService -> Supabase: 30. INSERT ai_meme_analysis{meme_id, storage_path, ...}
Supabase --> MemeArchiverService: 31. return success

ProcessService -> Supabase: 32. UPDATE scheduled_posts\nSET processing_lock=NULL, processing_lock_id=NULL
Supabase --> ProcessService: 33. return success

ProcessService -> Logger: 34. log('Post published', {postId, igMediaId, userId})

CronAPI --> ProcessService: 35. return BatchResult\n{processed: 1, succeeded: 1, failed: 0}

@enduml
```

---

## 4. SEQUENCE DIAGRAM - Webhook Direct Publishing

```plantuml
@startuml sequence_webhook_publish
participant External as "External System"
participant "POST /api/webhook/story" as WebhookAPI
participant AuthMiddleware
participant PublishService
participant FacebookAPI as "Meta Graph API"

External -> WebhookAPI: POST {url, type?, email?, caption?}\nHeader: x-webhook-secret

WebhookAPI -> AuthMiddleware: 1. Validate x-webhook-secret
AuthMiddleware --> WebhookAPI: 2. return isValid (true/false)

alt auth_failed
  WebhookAPI --> External: 401 Unauthorized
  note over WebhookAPI: Missing/invalid webhook secret
else auth_success
  WebhookAPI -> LinkedAccountService: 3. Resolve email -> userId
  LinkedAccountService -> Supabase: 4. SELECT user_id FROM allowed_users WHERE email=?
  Supabase --> LinkedAccountService: 5. return userId

  WebhookAPI -> PublishService: 6. publishMedia(url, type, 'STORY', caption, userId)
  PublishService -> LinkedAccountService: 7. getFacebookAccessToken(userId)
  LinkedAccountService --> PublishService: 8. return accessToken

  PublishService -> FacebookAPI: 9. Create container, wait ready, publish
  FacebookAPI --> PublishService: 10. return {igMediaId}

  PublishService --> WebhookAPI: 11. return {success: true, igMediaId}

  WebhookAPI -> Supabase: 12. INSERT scheduled_posts\n{url, type, caption, status='published', ig_media_id, ...}
  Supabase --> WebhookAPI: 13. return success

  WebhookAPI --> External: 200 {success: true, igMediaId}
end

@enduml
```

---

## 5. ACTIVITY DIAGRAM - Cron Processing Flow

```plantuml
@startuml activity_cron_process
start
:Verify cron secret;
if (Secret valid?) then (no)
  :Return 401 Unauthorized;
  end
else (yes)
  :Query pending posts WHERE scheduled_time <= NOW();
  :Get posts list;
  if (Any posts?) then (no)
    :Return {processed: 0, succeeded: 0, failed: 0};
    end
  else (yes)
    repeat
      :Acquire processing lock for post;
      if (Lock acquired?) then (no)
        :Skip post (already processing);
      else (yes)
        :Generate content hash if missing;
        :Check for duplicate content\n(same user, 24h window);
        if (Is duplicate?) then (yes)
          :Mark status = 'failed';
          :Set error = 'Duplicate content detected';
          :Increment retry_count;
        else (no)
          :Call publishMedia(url, type, postType, caption, userId);
          if (Publishing successful?) then (yes)
            :Update status = 'published';
            :Set ig_media_id;
            :Set published_at = NOW();
            :Save meme for AI analysis;
            :Log success;
          else (no)
            :Update status = 'failed';
            :Store error message;
            :Increment retry_count;
            if (retry_count < max_retries?) then (yes)
              :Keep in pending for next cron;
            else (no)
              :Mark status = 'failed' permanently;
            endif
            :Log failure;
          endif
        endif
        :Release processing lock;
      endif
    repeat while (More posts?)

    :Compile results\n(processed, succeeded, failed);
    :Log batch result;
    :Return BatchResult;
    stop
  endif
endif

@enduml
```

---

## 6. STATE DIAGRAM - Scheduled Post Lifecycle

```plantuml
@startuml state_post_lifecycle
[*] --> pending: create_post()

pending --> processing: cron_process()\nacquire_lock()
pending --> failed: duplicate_detected()
pending --> cancelled: user_delete()

processing --> published: publish_success()\nset_ig_media_id
processing --> failed: publish_failed()\nerror_occurred
processing --> pending: lock_released\nretry_eligible

failed --> pending: admin_retry()
failed --> cancelled: admin_cancel()

published --> [*]: lifecycle_complete

cancelled --> [*]: no_recovery

note right of pending
  Status: waiting for scheduled_time to arrive
  Processing: scheduled_time <= NOW()
end note

note right of processing
  Status: currently being published
  Lock: distributed lock active
  Duration: typically < 30 seconds
end note

note right of published
  Status: successfully published to Instagram
  ig_media_id: set from Meta API
  published_at: timestamp recorded
end note

note right of failed
  Status: publishing failed
  error: reason for failure stored
  retry_count: incremented for tracking
  Recovery: admin can manually retry
end note

note right of cancelled
  Status: user deleted before publishing
  No recovery possible
end note

@enduml
```

---

## 7. COMPONENT DIAGRAM - System Architecture

```plantuml
@startuml component_architecture
package "Frontend (Next.js App Router)" {
  component Pages as "Pages\n[locale]/memes\n[locale]/schedule\n[locale]/admin/*"
  component Components as "React Components\n<use client> interactive\nServer Components for data"
  component Hooks as "Custom Hooks\nuseSWR, usePostForm\nuseScheduledPosts"
  component Validations as "Client Validations\nZod schemas"
}

package "Authentication & Middleware" {
  component Auth as "NextAuth\nGoogle OAuth\nSupabase Adapter"
  component Middleware as "Route Middleware\nauth verification\nRBAC checks"
}

package "API Layer (Next.js Route Handlers)" {
  component MemesAPI as "/api/memes/*\nsubmit, review,\nschedule, delete"
  component ScheduleAPI as "/api/schedule/*\ncreate, update,\ndelete, insights"
  component AdminAPI as "/api/admin/*\nuser management"
  component WebhookAPI as "/api/webhook/*\nstory, instagram"
  component CronAPI as "/api/cron/*\nprocess, audit"
  component AuthAPI as "/api/auth/*\nlink-facebook,\nextend-token"
}

package "Service Layer" {
  component AuthSvc as "Auth Service\nauthHelpers\nsession mgmt"
  component DBSvc as "Database Services\nScheduledPosts\nMemeSubmission\nLinkedAccount"
  component PublishSvc as "Publishing Service\ncontainer mgmt\nerror handling"
  component MediaSvc as "Media Services\nvalidator\nvideo processor\nphash"
  component ProcessSvc as "Processing Service\nscheduler logic\nlock management"
  component UtilSvc as "Utility Services\nlogger, retry\nnotification"
}

package "External Integrations" {
  component Supabase as "Supabase\nPostgreSQL\nStorage (media)\nAuth adapter"
  component MetaAPI as "Meta Graph API\nInstagram publish\nContainer mgmt\nQuota API"
  component FacebookOAuth as "Facebook OAuth\nToken exchange\nToken refresh"
  component GoogleOAuth as "Google OAuth\nSign-in provider"
}

package "Data & Caching" {
  component Cache as "Client Cache\nSWR (Next.js)\nStorage bucket\nlocal state"
}

' Frontend connections
Pages --> Components: uses
Components --> Hooks: calls
Hooks --> Cache: reads/writes
Components --> Validations: validates with
Pages --> Auth: requires session

' Middleware connections
Middleware --> Auth: checks auth
Middleware --> Pages: protects routes

' API connections
MemesAPI --> AuthSvc: requires auth
MemesAPI --> DBSvc: queries memes
MemesAPI --> MediaSvc: validates media

ScheduleAPI --> AuthSvc: requires auth
ScheduleAPI --> DBSvc: manages posts
ScheduleAPI --> PublishSvc: publishes directly

AdminAPI --> AuthSvc: requires admin role
AdminAPI --> DBSvc: manages users/posts

WebhookAPI --> AuthSvc: webhook auth
WebhookAPI --> PublishSvc: publishes
WebhookAPI --> DBSvc: records post

CronAPI --> ProcessSvc: processes posts
CronAPI --> AuthSvc: cron secret validation
ProcessSvc --> DBSvc: queries pending
ProcessSvc --> PublishSvc: publishes
ProcessSvc --> UtilSvc: logging

AuthAPI --> FacebookOAuth: token exchange
AuthAPI --> DBSvc: saves account

' Service connections
PublishSvc --> MetaAPI: publishes media
PublishSvc --> DBSvc: updates status
PublishSvc --> UtilSvc: logging, retry

ProcessSvc --> DBSvc: locking, queries
ProcessSvc --> PublishSvc: publishes
ProcessSvc --> UtilSvc: logging

DBSvc --> Supabase: CRUD operations
DBSvc --> Cache: invalidates

AuthSvc --> Supabase: session ops
AuthSvc --> GoogleOAuth: sign-in
AuthSvc --> FacebookOAuth: token mgmt

MediaSvc --> Supabase: storage
MediaSvc --> UtilSvc: validation logging

' External integrations
MetaAPI --> FacebookOAuth: requires token
GoogleOAuth --> Supabase: creates user

@enduml
```

---

## 8. DEPLOYMENT DIAGRAM

```plantuml
@startuml deployment
artifact "Client Browser" as client
artifact "Vercel Edge Network" as edge
artifact "Vercel Functions" as functions
artifact "Supabase Cloud" as supabase_cloud
artifact "Supabase PostgreSQL" as postgres
artifact "Supabase Storage" as storage
artifact "Meta Graph API Servers" as meta_api
artifact "Facebook OAuth Servers" as fb_oauth

client --> edge: HTTPS
edge --> functions: Routes requests
edge --> client: Serves static assets

functions --> postgres: queries via HTTPS
functions --> storage: file ops
functions --> meta_api: publishes media
functions --> fb_oauth: token exchange

postgres --> functions: returns data
storage --> functions: file URLs
meta_api --> functions: API responses
fb_oauth --> functions: tokens

client --> functions: API calls
client --> edge: static assets

note right of functions
  Next.js App Router
  API Routes
  Cron Triggers
end note

note right of postgres
  RLS Policies enforced
  Real-time subscriptions
  Backups configured
end note

note right of storage
  Public: media files
  Private: ai-analysis
  Signed URLs for access
end note

note right of meta_api
  Graph API v21.0+
  Container management
  Publishing endpoints
  Quota checking
end note

@enduml
```

---

## 9. DETAILED STATE MACHINE - Meme Submission Lifecycle

```plantuml
@startuml meme_lifecycle
[*] --> pending: submit_meme()

pending --> approved: admin_approve()
pending --> rejected: admin_reject_with_reason()
pending --> [*]: auto_delete_after_30_days()

approved --> scheduled: admin_schedule(time)
approved --> [*]: auto_delete_after_90_days()

rejected --> [*]: user_notified\nauto_delete_after_30_days()

scheduled --> pending_publish: await_scheduled_time()

pending_publish --> published: cron_publish_success()
pending_publish --> publish_failed: cron_publish_failed()

published --> [*]: complete

publish_failed --> pending_publish: admin_retry()

note right of pending
  • User has uploaded meme
  • Waiting for admin review
  • Duplicate check passed
  • Auto-delete after 30 days
end note

note right of approved
  • Admin reviewed and approved
  • Not yet scheduled
  • Can be scheduled or rejected later
end note

note right of rejected
  • Admin rejected with reason
  • User notified of rejection
  • User cannot edit
  • Auto-deleted after 30 days
end note

note right of scheduled
  • Approved and scheduled
  • Awaiting scheduled_time
  • Cron will publish automatically
  • Can be cancelled by admin
end note

note right of pending_publish
  • scheduled_time has arrived
  • Processing started
  • Lock acquired to prevent duplicates
end note

note right of published
  • Successfully published to Instagram
  • ig_media_id recorded
  • Meme archived for AI analysis
  • User can view published post
end note

note right of publish_failed
  • Publishing failed (API error, rate limit, etc)
  • Error message recorded
  • Admin can retry or cancel
  • Auto-retry logic applies
end note

@enduml
```

---

## 10. INTEGRATION SEQUENCE - Facebook OAuth Token Refresh

```plantuml
@startuml sequence_token_refresh
participant App
participant "POST /api/auth/extend-token" as ExtendAPI
participant LinkedAccountService as "LinkedAccountService"
participant FacebookOAuth as "Facebook OAuth\nhttps://graph.facebook.com"
participant Supabase
participant Logger

App -> ExtendAPI: POST {userId}

ExtendAPI -> LinkedAccountService: 1. refreshAccessToken(userId)

LinkedAccountService -> Supabase: 2. SELECT * FROM linked_accounts\nWHERE user_id = ?
Supabase --> LinkedAccountService: 3. return {refresh_token, expires_at, ...}

LinkedAccountService -> FacebookOAuth: 4. POST /oauth/access_token\n?grant_type=refresh_token\n&refresh_token={token}\n&client_id={FB_APP_ID}\n&client_secret={FB_APP_SECRET}
FacebookOAuth --> LinkedAccountService: 5. {access_token, refresh_token, expires_in}

LinkedAccountService -> Logger: 6. log('Token refreshed',\n{userId, expiresIn, masked_token})\nNote: token masked as token.slice(0,6)+'...'

LinkedAccountService -> Supabase: 7. UPDATE linked_accounts\nSET access_token={new_token},\n    refresh_token={new_refresh},\n    expires_at={new_expiry},\n    updated_at=NOW()\nWHERE user_id = ?
Supabase --> LinkedAccountService: 8. return success

LinkedAccountService --> ExtendAPI: 9. return {success, expiresAt}

ExtendAPI --> App: 10. 200 {success: true, expiresAt}\nOR\n401 {error: 'Token refresh failed'}

alt token_expires_in_7_days
  App -> ExtendAPI: 11. Show notification\n'Your Instagram token expires in 7 days.\nClick to extend'
else token_expired
  App -> ExtendAPI: 12. Block publishing\nShow error: 'Token expired.\nPlease re-link Facebook account'
end

@enduml
```

---

## 11. SECURITY CONTEXT DIAGRAM

```plantuml
@startuml security_context
package "Authentication Layers" {
  component GoogleOAuth as "Google OAuth\n(Sign-in)\nRequired for all users"
  component FacebookOAuth as "Facebook OAuth\n(Publishing)\nRequired for Instagram publishing"
  component SessionJWT as "NextAuth JWT\nStored in httpOnly cookie\nContains: user_id, role,\ninstagramAccount info"
  component SupabaseRLS as "Supabase RLS\nRow-level policies\nEnforce data isolation"
}

package "Authorization Layers" {
  component AllowedUsersList as "Allowed Users Whitelist\n(allowed_users table)\nAuto-populated from\nAdmin email env var"
  component RoleBasedAccess as "Role-Based Access\nDeveloper, Admin, User\nControlled via middleware"
  component AdminJWT as "Admin JWT Marker\nIncludes role in token\nChecked on protected routes"
}

package "API Security" {
  component WebhookSecret as "Webhook Secret\n(x-webhook-secret header)\nFor external integrations"
  component CronSecret as "Cron Secret\n(Bearer token header)\nFor Vercel cron triggers"
  component InputValidation as "Input Validation\n(Zod schemas)\nPrevents injection attacks"
  component RateLimit as "Rate Limiting\n(Coming soon)\nOn auth, publish endpoints"
}

package "Data Security" {
  component TokenEncryption as "Token Encryption\n(Supabase)\nAccess tokens encrypted\nat rest"
  component TokenMasking as "Token Masking in Logs\ntoken.slice(0, 6) + '...'\nPrevents accidental exposure"
  component URLSanitization as "URL Sanitization\nBefore passing to Meta API\nPrevents SSRF"
  component ContentHash as "Content Hash (SHA-256)\nDeduplication detection\nPrevents duplicate posts"
}

package "API Security (Meta)" {
  component MetaTokenValidation as "Meta Token Validation\nCheck expires_at before use\nAuto-refresh if needed"
  component MetaErrorHandling as "Error Code Handling\n190 = expired token\n368 = rate limit\n100 = invalid param"
  component RetryLogic as "Retry Logic\nExponential backoff\nMax 3 retries"
}

GoogleOAuth --> SessionJWT: creates
FacebookOAuth --> TokenEncryption: encrypted token\nstored
SessionJWT --> SupabaseRLS: enables policies
AllowedUsersList --> RoleBasedAccess: populates
RoleBasedAccess --> AdminJWT: marks admin
InputValidation --> RateLimit: validates before\nrating
TokenMasking --> Logger: prevents exposure
URLSanitization --> MetaTokenValidation: clean requests
ContentHash --> DuplicateDetection: finds dupes
MetaTokenValidation --> MetaErrorHandling: handles errors
MetaErrorHandling --> RetryLogic: retries on transient

@enduml
```

---

## 12. TIMING DIAGRAM - Cron vs Scheduled Time

```plantuml
@startuml timing_cron_vs_scheduled
concise cron as "Cron Process"
concise post as "Scheduled Post"
concise lock as "Processing Lock"

@0
cron is idle
post is pending: "scheduled_time = 14:30"
lock is released

@730
post is pending
note right on post
  scheduled_time approaching
  (14:30 - 1 min = 14:29)
end note

@900
cron is processing: "① Query pending posts"
post is pending: "scheduled_time = 14:30 reached!"

@905
cron is checking: "② Check scheduled_time <= NOW()"
lock is acquired

@910
cron is validating: "③ Validate & check duplicates"
post is pending

@920
cron is publishing: "④ Call publishMedia()"
lock is held

@1130
cron is waiting: "⑤ Poll container status"
lock is held

@1200
cron is publishing_cont: "⑥ Publish container"
lock is held

@1210
cron is completing: "⑦ Update status=published"
post is published: "ig_media_id set"
lock is released

@1215
cron is idle
post is published
lock is released

@enduml
```

---

## 13. DATA FLOW DIAGRAM - End-to-End Publishing

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA FLOW: Meme to Instagram                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Uploads │
│  Meme File   │
└──────┬───────┘
       │ (media_url, caption, title)
       ▼
┌──────────────────┐
│ Validation Layer │───► Check: file type, size, dimensions
│                  │───► Duplicate check: content hash
└──────┬───────────┘
       │ (validated meme data)
       ▼
┌────────────────────────┐
│ Supabase Storage &     │───► Store media file (public URL)
│ meme_submissions table │───► Insert meme record (status=pending)
└──────┬─────────────────┘
       │ (meme_id, status, content_hash)
       ▼
┌──────────────────────┐
│ Admin Review Panel   │
│ (Dashboard)          │
└──────┬───────────────┘
       │ (admin decision: approve/reject/schedule)
       ▼
    IF APPROVED & SCHEDULED:
┌─────────────────────────────────┐
│ Create scheduled_posts entry    │
│ - url = meme.media_url          │
│ - status = pending              │
│ - scheduled_time = admin choice │
│ - meme_id reference             │
└──────┬────────────────────────────┘
       │
       ▼
    WAIT FOR SCHEDULED_TIME
       │
       ▼
┌─────────────────────────────────┐
│ Vercel Cron Trigger             │ (every minute)
│ /api/cron/process               │
└──────┬────────────────────────────┘
       │ Query: scheduled_posts where
       │   status='pending' AND
       │   scheduled_time <= NOW()
       ▼
┌─────────────────────────────────┐
│ Acquire Processing Lock         │
│ (Prevent duplicate processing)  │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Duplicate Content Check         │
│ Compare content_hash with       │
│ published posts (24h window)    │
└──────┬────────────────────────────┘
       │ IF NO DUPLICATES:
       ▼
┌─────────────────────────────────┐
│ Publishing Service              │
│ 1. publishMedia(url, type,      │
│    caption, userId)             │
└──────┬────────────────────────────┘
       │
       ├─► Fetch user's Instagram token
       │   from linked_accounts
       │
       ├─► Call Meta Graph API:
       │   POST /media
       │   - image_url = meme.url
       │   - caption = meme.caption
       │   - media_type = IMAGE
       │   - access_token
       │   RETURNS: container_id
       │
       ├─► Poll /media status:
       │   GET /container?fields=status
       │   UNTIL status=FINISHED or ERROR
       │
       ├─► Publish container:
       │   POST /media_publish
       │   - creation_id = container_id
       │   - access_token
       │   RETURNS: ig_media_id
       │
       ▼
┌─────────────────────────────────┐
│ Update Database                 │
│ UPDATE scheduled_posts:         │
│ - status = published            │
│ - ig_media_id = from Meta API   │
│ - published_at = NOW()          │
│ - processing_lock = NULL        │
└──────┬────────────────────────────┘
       │
       ├─► Archive for AI Analysis
       │   INSERT ai_meme_analysis
       │   - download media file
       │   - upload to ai-analysis bucket
       │   - track metadata
       │
       ├─► Update meme record
       │   UPDATE meme_submissions
       │   - status = published
       │   - ig_media_id = same
       │
       ▼
┌─────────────────────────────────┐
│ Logging & Notifications         │
│ - Log success                   │
│ - Notify admin                  │
│ - Send user notification        │
└──────┬────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Instagram User Story Stream     │
│ (published, visible to followers)
└─────────────────────────────────┘

═════════════════════════════════════════════════════════════════════
ERROR HANDLING PATHS:

IF DUPLICATE DETECTED:
  → Mark status = failed
  → error = "Duplicate content detected"
  → Log warning

IF DUPLICATE CHECK FAILS:
  → Mark status = failed
  → error = error message
  → retry_count++

IF PUBLISHING FAILS:
  → Mark status = failed
  → error = "Meta API error: [code] [message]"
  → IF retryable error (5xx, 429):
       retry_count++, status stays pending (retry next cron)
  → IF non-retryable error (4xx auth, 404):
       Mark final failed, manual review needed
  → Log error with context

IF LOCK ACQUISITION FAILS:
  → Skip post (already being processed)
  → Log info "Post already processing"

═════════════════════════════════════════════════════════════════════
```

---

## Summary

This comprehensive UML documentation includes:

1. **ER Diagram** - All database tables, relationships, and policies
2. **Class Diagram** - Services, methods, and dependencies
3. **Sequence Diagrams** - Meme submission flow, webhook publishing, token refresh
4. **Activity Diagram** - Cron processor decision flow
5. **State Diagrams** - Post and meme submission lifecycle
6. **Component Diagram** - System architecture and integration points
7. **Deployment Diagram** - Cloud infrastructure and external services
8. **Security Context** - Authentication, authorization, and data security
9. **Timing Diagram** - Cron triggers vs scheduled times
10. **Data Flow** - End-to-end publishing pipeline with error paths

All diagrams can be rendered using PlantUML (convert to PNG/SVG via online tools or local installation).
