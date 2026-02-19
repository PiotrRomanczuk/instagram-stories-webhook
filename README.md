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
| **Media** | `FFmpeg`, `Sharp` | Professional-grade video processing and image optimization. |
| **Testing** | `Vitest`, `Playwright` | 83% faster CI/CD pipeline with E2E coverage. |

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

> [!TIP]
> Check out the [Architecture & Workflows Diagram](docs/comprehensive/ARCHITECTURE_AND_WORKFLOWS.md) for a technical deep-dive.

---

## 🚀 Recent Release History

### **v0.21.1 - Documentation & Polish** (Feb 18, 2026)
*   **📚 Documentation Overhaul**: Complete restructuring of technical and non-technical guides for faster onboarding.
*   **🏗 Architecture Diagrams**: Added visual flows for all major system processes (publishing, scheduling, authentication).
*   **📱 Mobile Polish**: Minor UI improvements for the new swipe gestures.

### **v0.20.0 - The "Mobile UX" Update** (Feb 18, 2026)
*   **👆 Swipe to Review**: Introduced a Tinder-like "Swipe Left/Right" interface for admins to quick-review pending memes on mobile.
*   **👮‍♀️ History Permission Control**: Admins can now re-review previously processed items directly from their mobile history view.

### **v0.19.5 - Video Upload & Preview Engine** (Feb 17-18, 2026)
*   **🚀 Direct-to-Storage Uploads**: Re-architected system to bypass Vercel limits via direct Supabase Storage uploads.
*   **🎥 Unified Video Player**: Fixed playback issues on iOS/Safari across all dashboards.
*   **🖼 Intelligent Thumbnails**: Automatic generation of video thumbnails for the grid view.

---

## 📖 Complete Documentation

Explore our comprehensive guides to master the system:

| Guide | Description |
| :--- | :--- |
| 📖 **[GUIDES.md](./docs/GUIDES.md)** | Feature deep-dives and production setup. |
| 🛠 **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** | Solve common Meta API & deployment issues. |
| 🛡 **[META_PERMISSIONS.md](./docs/META_PERMISSIONS.md)** | Detailed reference for API scopes. |
| 🚀 **[CLIENT_SETUP_GUIDE.md](./docs/CLIENT_SETUP_GUIDE.md)** | Step-by-step branding for new clients. |
| 🥧 **[PI_DEPLOYMENT.md](./docs/PI_DEPLOYMENT.md)** | Running local worker on Raspberry Pi. |
| 🏗 **[Architecture](docs/comprehensive/ARCHITECTURE_AND_WORKFLOWS.md)** | System diagrams and data flows. |
| 📜 **[History](docs/non-technical/FEATURE_IMPLEMENTATION_HISTORY.md)** | Full feature implementation timeline. |

---

## ⚙️ Application Settings

Configure your production environment via the built-in Settings dashboard:
1. Navigate to **Developer Tools** → **Application Settings** (`/settings`)
2. Update API keys, Supabase credentials, and Webhook secrets.
3. Settings are stored securely in `data/app-config.json`.

---

## 🆘 Need Help?

*   **Interactive Debug**: Run `./scripts/debug-auth.bat`
*   **Status Center**: Visit `http://localhost:3000/debug`
*   **Discord**: Join our community for real-time support.

---

Built with ❤️ by **Antigravity**
