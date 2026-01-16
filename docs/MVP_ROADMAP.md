# 🎯 MVP Production Roadmap (Instagram Story Automation)

To move this project from a local development environment to a stable **Production MVP**, the following tasks must be completed.

---

## 🔐 1. Security (Critical for Production)
- [x] **Webhook Authentication**: Add a `WEBHOOK_SECRET` check to `/api/webhook/story`. Currently, anyone with the URL can trigger a post.
- [x] **Cron Security**: Secure the `/api/schedule/process` endpoint with an `CRON_SECRET` or `API_KEY` header to prevent unauthorized trigger of the scheduling engine.
- [ ] **Environment Validation**: Implement a startup check to ensure all required Meta and Supabase environment variables are present and valid.

## 📁 2. Media Handling & Storage (No more manual URLs)
- [x] **Supabase Storage Integration**:
    - [x] Create a `stories` bucket in Supabase (Publicly accessible for Meta to grep).
    - [x] Implement a file upload component in the `ScheduleForm`.
    - [x] Update the database to store the Supabase URL instead of requiring a manual external link.
- [ ] **Media Optimization**: Implement server-side check for Meta requirements:
    - Images: JPEG/PNG, < 8MB, 4:5 to 9:16 aspect ratio.
    - Videos: MP4, < 100MB, 3-60 seconds duration.
- [x] **Auto-Cleanup**: Add a hook to delete media from Supabase Storage once the story is successfully published or fails permanently.

## 🛠️ 3. Reliability & UX
- [x] **Automated Token Refresh**: 
    - [x] Implement a script/route to refresh the Long-Lived User Token (valid for 60 days) before it expires.
    - [ ] Add a "Token Health" status on the dashboard.
- [ ] **Retry Logic**: Implement an exponential backoff for the Instagram Publishing API (Meta's API can be flaky with container status).
- [x] **Real-time Status**: Integrate Supabase Realtime so the "Scheduled Posts" list updates automatically when a post is published by the cron job.
- [x] **Error Details**: Improve the UI to show *why* a post failed (e.g., "Meta API: Video bitrate too high") instead of just "Failed".

## 🚀 4. Deployment & DevOps (Raspberry Pi / Local)
- [ ] **PM2 Setup**: Configure PM2 to keep the Next.js production server (`npm start`) running after reboots.
- [ ] **Local Cron Configuration**: 
    - [ ] Set up a system crontab to ping `/api/schedule/process` every minute.
    - [ ] Set up a system crontab to ping `/api/schedule/refresh-token` every Sunday.
- [ ] **SSL & Remote Access**: 
    - [ ] Configure a **Cloudflare Tunnel** (`cloudflared`) to expose the local server to the internet securely.
    - [ ] Update Meta App dashboard with the new Tunnel URL for OAuth Redirects.
- [ ] **Log Monitoring**: Use PM2 logs or redirect cron output to a local log file for monitoring.

---

## ✅ Completed (MVP Foundation)
- [x] Supabase PostgreSQL migration (Tokens & Posts).
- [x] Long-lived token exchange logic.
- [x] Modularized Instagram API client.
- [x] Basic scheduling UI.
