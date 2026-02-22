# 📸 Instagram Story Automation & Webhook

[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2016-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

A high-performance, enterprise-grade Next.js application designed to streamline programmatically publishing and scheduling Instagram Stories via the **Meta Graph API**. Featuring a mobile-first "Swipe to Review" workflow and direct-to-storage video processing.

---

## ✨ Core Features

| 🚀 Instant Publishing | 🗓 Smart Scheduling | 📱 Mobile UX | 🛡 Secure Auth |
|:---:|:---:|:---:|:---:|
| Send stories instantly via Webhooks or the Admin UI. | Queue content for the perfect engagement window. | Tinder-style swipe gestures for rapid content review. | Long-lived token management with automatic refresh. |

> [!IMPORTANT]
> This application requires a **Facebook Business Account** linked to an **Instagram Professional Account**.

---

## 🛠️ Technology Stack

| Category | Tech | Description |
| :--- | :--- | :--- |
| **Frontend** | `React 19`, `Next.js 16` | App Router, Server Components, Streaming SSR. |
| **Styling** | `Tailwind CSS 4` | Utility-first aesthetics with modern design tokens. |
| **Backend** | `Next.js API Routes` | Serverless architecture for webhooks and cron jobs. |
| **Database** | `PostgreSQL` | Managed by Supabase with Realtime capabilities. |
| **Auth** | `NextAuth`, `Google OAuth` | Secure authentication with role-based access control. |
| **Media** | `FFmpeg`, `Sharp` | Professional-grade video processing and image optimization. |
| **Monitoring** | `Sentry` | Error tracking and performance monitoring. |
| **Validation** | `Zod` | Runtime type validation for API boundaries. |
| **Testing** | `Vitest`, `Playwright` | Dual E2E pipeline (preview + production) with unit coverage. |

---

## 🚀 Quick Start (5 Minutes)

### 1️⃣ Initial Setup
```bash
# Clone and install
git clone https://github.com/PiotrRomanczuk/instagram-stories-webhook.git
cd instagram-stories-webhook
npm install

# Launch development environment
npm run dev
```

### 2️⃣ Connect to Meta
1. Open your browser to [http://localhost:3000](http://localhost:3000) (Use **Incognito** for best results).
2. Click **"Connect Facebook"** and authorize the required permissions.
3. Once verified as **"Fully Authenticated"**, you're ready to go!

### 3️⃣ Test your first Story
Use the **"Quick Test Suite"** on the dashboard to verify your connection by publishing a test image or video.

---

## 🔄 Core Workflows

The system is built around three primary automation loops:
1.  **Meme Submission**: Users submit content → Deduplication check → Review Queue.
2.  **Admin Review**: Mobile-first swipe interface → Approve & Schedule or Reject.
3.  **Auto-Publishing**: A high-reliability cron runner picks up pending posts and pushes them to the Meta API.
4.  **Video Processing**: Upload → FFmpeg optimization (1080x1920, H.264) → Instagram publish.
5.  **Webhook Publishing**: External triggers for instant story publishing via authenticated API.

> [!TIP]
> Check out the [Architecture & Workflows Diagram](docs/comprehensive/ARCHITECTURE_AND_WORKFLOWS.md) for a technical deep-dive.

---

## 🚀 Recent Release History

### **v0.32.3 - Security Hardening & Feature Fleet** (Feb 22, 2026)
*   **🛡 Security Hardening**: Webhook verification, auth kill switch, middleware role checks, token exposure removal.
*   **📊 Sentry Integration**: All API routes report errors with context for production visibility.
*   **📅 Desktop Calendar**: Week and month views on the Schedule page for desktop users.
*   **✏️ Edit Scheduled Posts**: Edit caption and time of pending posts directly from the content grid.
*   **🔧 15 PRs merged** in a single fleet operation covering security, observability, UX, and test coverage.

### **v0.27.0 - Admin Monitoring & Audit Logging** (Feb 22, 2026)
*   **📊 Admin Dashboard**: Real-time health metrics, audit log viewer, auth event history, and cleanup management.
*   **🗃 Audit Infrastructure**: New `admin_audit_log` and `auth_events` tables with server utilities.
*   **🧹 Cleanup Cron**: Daily pruning of stale audit and event records.

### **v0.26.0 - Version History & Automation** (Feb 21, 2026)
*   **🔍 Gap Detection**: Script to detect missing version entries between git tags and docs.
*   **📜 History Enhancement**: Per-version verified hours, daily reports, and full work session log.
*   **🔄 Workflow Automation**: History update reminders in `/ship` and `/deploy-production` workflows.

> See the [full feature implementation history](docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md) for all 35 releases.

---

## 📖 Complete Documentation

Explore our comprehensive guides to master the system:

| Guide | Description |
| :--- | :--- |
| 🛠 **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** | Solve common Meta API & deployment issues. |
| 🛡 **[META_PERMISSIONS.md](./docs/META_PERMISSIONS.md)** | Detailed reference for API scopes. |
| 🚀 **[CLIENT_SETUP_GUIDE.md](./docs/CLIENT_SETUP_GUIDE.md)** | Step-by-step branding for new clients. |
| 🚢 **[DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** | Production deployment and CI/CD pipeline. |
| 🧪 **[TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md)** | Testing philosophy, E2E vs unit strategy. |
| 🏗 **[Architecture](docs/comprehensive/ARCHITECTURE_AND_WORKFLOWS.md)** | System diagrams and data flows. |
| 📜 **[History](docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md)** | Full feature implementation timeline. |

---

## ⚙️ Application Settings

Configure your production environment via the built-in Settings dashboard:
1. Navigate to **Developer Tools** → **Application Settings** (`/settings`).
2. Update API keys, Supabase credentials, and Webhook secrets.
3. Settings are managed via the `/settings` page and environment variables, backed by Supabase.

---

## 🆘 Need Help?

*   **Status Center**: Visit `/debug` for token and connection status.
*   **Troubleshooting**: Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common Meta API issues.
*   **New Client Setup**: Review [docs/CLIENT_SETUP_GUIDE.md](docs/CLIENT_SETUP_GUIDE.md) for onboarding.

---

Built with ❤️ by **Antigravity**
