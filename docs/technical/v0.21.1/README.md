# Technical Documentation - v0.21.1

## 🏗️ System Architecture

Instagram Stories Webhook is a robust automation platform built with modern web technologies, designed to streamline content publishing from various sources to Instagram Stories.

### Tech Stack
- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Components)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, GoTrue, Storage)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **API Integration**: [Meta Graph API](https://developers.facebook.com/docs/instagram-api/) (Instagram Graph API v21.0)
- **Media Processing**: [Sharp](https://sharp.pixelplumbing.com/) (Images) & [FFmpeg](https://ffmpeg.org/) (Videos)
- **Monitoring**: [Sentry](https://sentry.io/) & [Vercel Logs](https://vercel.com/docs/concepts/observability/logs)

### Architecture Overview
The system follows a modular architecture:
1.  **Frontend**: Interactive dashboard for meme submission, scheduling, and administration.
2.  **API Layer**: Next.js Route Handlers managing business logic and external integrations.
3.  **Service Layer**: Decoupled services for publishing, media processing, and data management.
4.  **Worker/Cron**: Scheduled tasks for processing queue and maintenance.

---

## 📅 Data Model (ERD)

| Entity | Description |
| :--- | :--- |
| **users** | Managed by NextAuth/Supabase Auth. |
| **allowed_users** | Whitelist with roles (`user`, `admin`, `developer`). |
| **linked_accounts** | Encrypted Facebook/Instagram OAuth tokens. |
| **meme_submissions** | User-submitted content awaiting review. |
| **scheduled_posts** | Queue for publishing, including status and logs. |
| **system_logs** | Centralized audit trail for all core actions. |

---

## 🚀 Core Workflows

### 1. Publishing Pipeline
`Meme Submission` → `Admin Review` → `Scheduled Queue` → `Cron Processor` → `IG Publish`

- **Deduplication**: SHA-256 hashing prevents duplicate content within a 24h window.
- **Locking**: Distributed locking mechanism prevents race conditions during multi-instance cron execution.
- **Retries**: Exponential backoff for transient Meta API errors (190, 368).

### 2. Media Processing
- **Story Format**: Automaticaly enforces 9:16 aspect ratio.
- **Transcoding**: FFmpeg ensures video compatibility with IG standards (H.264, MP4).
- **Auto-Cleanup**: Temporary media is deleted 24h after successful publishing.

---

## 📡 API Endpoints

| Endpoint | Method | Description | Auth |
| :--- | :--- | :--- | :--- |
| `/api/memes` | `POST` | Submit content for review | User |
| `/api/admin/memes/[id]/review` | `PATCH` | Approve/Reject submission | Admin |
| `/api/cron/process` | `GET` | Trigger publishing worker | API Key |
| `/api/webhook/story` | `POST` | Remote story publishing | Secret |

---

## 🛠️ Deployment & Maintenance

### Deployment
The application is deployed on **Vercel**.
- **Production**: Connected to `main` branch.
- **Staging**: Connected to `staging` branch.
- **Migrations**: Supabase migrations run automatically via GitHub Actions or manual CLI.

### Monitoring
- **Error Tracking**: Sentry (Client/Server/Edge).
- **Cron Monitoring**: IPhone Widget integration for real-time status.
- **Health Checks**: `/debug` page provides a connectivity overview.

---

## 🧪 Testing Strategy
- **Unit/Integration**: Vitest for core logic and API handlers.
- **E2E**: Playwright for critical user journeys (Submission -> Publish).
- **Visual**: Automated screenshots for mobile UI regression.

---
*Last Updated: 2026-02-18 | Version: 0.21.1*
