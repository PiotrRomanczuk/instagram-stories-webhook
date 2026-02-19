# Comprehensive Architecture & User Workflows

This document provides a comprehensive overview of the application architecture, user workflows, and data flow, visualized through diagrams.

---

## 1. System Architecture Overview

The application is built using a modern full-stack TypeScript architecture, leveraging **Next.js 16 (App Router)** for both frontend and backend API, **Supabase** for database and authentication, and **Instagram Graph API** for content publishing.

### High-Level Architecture Diagram

```mermaid
graph TD
    subgraph "Frontend (Client)"
        Browser[User Browser]
        NextApp[Next.js App Router]
        ClientComp[Client Components]
        ServerComp[Server Components]
    end

    subgraph "Backend Services (Server)"
        API[Next.js API Routes]
        Cron[Cron Job Service]
        Auth[NextAuth.js]
        MediaProc[Media Processor (FFmpeg/Sharp)]
    end

    subgraph "External Services"
        Supabase[(Supabase PostgreSQL)]
        Storage[Supabase Storage]
        IG_API[Instagram Graph API]
        Webhook[External Webhooks]
    end

    Browser -->|HTTPS| NextApp
    NextApp -->|SSR/RSC| ServerComp
    NextApp -->|Interactivity| ClientComp
    
    ClientComp -->|Fetch| API
    ServerComp -->|Async Data| Supabase
    ServerComp -->|Auth| Auth

    API -->|Query| Supabase
    API -->|Upload| Storage
    API -->|Publish| IG_API

    Cron -->|Poll Pending Posts| API
    Webhook -->|Trigger| API

    Auth -->|OAuth| Supabase
```

---

## 2. Technology Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | React 19, Next.js 16 | App Router, Server Components |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **UI Library** | Radix UI | Headless accessible components |
| **Backend** | Next.js API Routes | Serverless functions |
| **Database** | PostgreSQL | Managed by Supabase |
| **Auth** | NextAuth.js | Authentication w/ Google Provider |
| **Storage** | Supabase Storage | S3-compatible object storage |
| **Testing** | Vitest, Playwright | Unit and E2E testing |
| **Scheduling** | Vercel Cron | Scheduled task execution |

---

## 3. Database Schema (ERD)

The database manages users, permissions (whitelist), social accounts, and content (memes/posts).

```mermaid
erDiagram
    users ||--o{ allowed_users : "permissions_lookup"
    users ||--o{ linked_accounts : "has_social_accounts"
    users ||--o{ scheduled_posts : "creates_posts"
    users ||--o{ meme_submissions : "submits_content"
    
    meme_submissions ||--o| scheduled_posts : "promoted_to"
    
    users {
        UUID id PK
        VARCHAR email
        VARCHAR name
        TIMESTAMP created_at
    }

    allowed_users {
        UUID id PK
        VARCHAR email
        ENUM role "admin, developer, user"
        TIMESTAMP created_at
    }

    linked_accounts {
        UUID id PK
        UUID user_id FK
        VARCHAR provider "facebook"
        VARCHAR access_token
        BIGINT expires_at
        VARCHAR ig_user_id
    }

    scheduled_posts {
        VARCHAR id PK
        UUID user_id FK
        VARCHAR url
        ENUM type "IMAGE, VIDEO"
        ENUM status "pending, processing, published, failed"
        BIGINT scheduled_time
        VARCHAR ig_media_id
        INT retry_count
    }

    meme_submissions {
        VARCHAR id PK
        UUID user_id FK
        VARCHAR media_url
        TEXT caption
        ENUM status "pending, approved, rejected, scheduled"
        VARCHAR content_hash
        TEXT rejection_reason
    }
```

---

## 4. User Workflows

### 4.1. User Onboarding & Authentication
Users must be whitelisted to access the system. Once authenticated via Google, they link their Facebook/Instagram account to enable publishing.

```mermaid
sequenceDiagram
    actor User
    participant App as Application
    participant Auth as NextAuth
    participant DB as Supabase
    participant FB as Facebook OAuth

    User->>App: Click "Sign in with Google"
    App->>Auth: Initiate OAuth Flow
    Auth-->>App: Session Created (Email Verified)
    
    App->>DB: Check 'allowed_users' whitelist
    alt User Not Whitelisted
        DB-->>App: Access Denied
        App-->>User: Show "Access Restricted" Page
    else User Allowed
        DB-->>App: User Role (Admin/User)
        App->>DB: Get Linked Accounts
        
        alt No Linked Account
            App-->>User: Prompt to Link Instagram
            User->>App: Click "Link Instagram"
            App->>FB: Redirect to Facebook Login
            FB-->>App: Return OAuth Code
            App->>FB: Exchange Code for Long-Lived Token
            App->>DB: Save Token & IG User ID
        end

        App-->>User: Show Dashboard
    end
```

### 4.2. Meme Submission Workflow
Users submit content for review. The system checks for duplicates using content hashing before accepting the submission.

```mermaid
flowchart TD
    Start([User Starts Submission]) --> Upload[Upload Media Check]
    Upload --> Hash{Generate Content Hash}
    Hash -->|Check DB| DupCheck{Duplicate Exists?}
    
    DupCheck -- Yes --> Reject[Reject: Duplicate Content]
    Reject --> End([End])
    
    DupCheck -- No --> Form[Fill Caption & Metadata]
    Form --> Submit[Submit to Review Queue]
    Submit --> SaveDB[(Save to meme_submissions)]
    SaveDB --> Notify[Notify Admins]
    Notify --> End
```

### 4.3. Admin Review & Scheduling Workflow
Admins review pending submissions and decide whether to approve/schedule them or reject them.

```mermaid
flowchart LR
    subgraph Admin_Actions
        Dashboard[Admin Dashboard] -->|View Pending| ReviewUI[Review Interface]
        ReviewUI -->|Reject| RejectAction[Mark Rejected]
        ReviewUI -->|Approve| ScheduleAction[Select Date/Time]
    end

    subgraph System_Actions
        RejectAction --> UpdateMeme[(Update Status: Rejected)]
        ScheduleAction --> CreatePost[(Create Scheduled Post)]
        CreatePost --> UpdateMemeStatus[(Update Status: Scheduled)]
    end
```

---

## 5. Automation & Data Flow

### 5.1. Scheduling & Publishing Process (Cron Job)
This process runs every minute to check for posts due for publishing. It handles locking, publishing to Instagram, and error recovery.

```mermaid
sequenceDiagram
    participant Cron as Cron Service
    participant API as /api/cron/process
    participant DB as Database
    participant IG as Instagram API

    loop Every Minute
        Cron->>API: Trigger Processing
        API->>DB: Query `scheduled_posts` (status=pending, time<=now)
        
        alt No Posts
            API-->>Cron: 200 OK (0 processed)
        else Posts Found
            loop For Each Post
                API->>DB: Acquire Lock (prevent double-publish)
                
                alt Lock Acquired
                    API->>DB: Get User's Access Token
                    
                    rect rgb(240, 248, 255)
                        note right of API: Instagram Graph API Flow
                        API->>IG: POST /media (Create Container)
                        IG-->>API: returns { creation_id }
                        
                        API->>IG: GET /status (Poll until FINISHED)
                        
                        API->>IG: POST /media_publish (Publish Container)
                        IG-->>API: returns { media_id }
                    end
                    
                    alt Success
                        API->>DB: Update status='published', ig_media_id
                    else Failure
                        API->>DB: Update status='failed', error_msg, retry_count++
                    end
                    
                    API->>DB: Release Lock
                end
            end
            API-->>Cron: 200 OK (Batch Result)
        end
    end
```

### 5.2. Webhook Data Flow
External services can trigger immediate story publishing via webhooks (e.g., from an automation tool like scriptable).

```mermaid
graph LR
    External[External System] -->|POST /api/webhook/story| WebhookAPI
    WebhookAPI -->|Validate Secret| AuthCheck{Authorized?}
    
    AuthCheck -- No --> 401[401 Unauth]
    
    AuthCheck -- Yes --> Payload[Parse Payload\n(url, caption)]
    Payload --> PublishService[Publishing Service]
    
    PublishService -->|Get Token| DB[(Database)]
    PublishService -->|Upload/Publish| IG[Instagram API]
    
    IG -->|Success ID| WebhookAPI
    WebhookAPI -->|200 OK| External
    
    PublishService -->|Log Entry| DB
```
