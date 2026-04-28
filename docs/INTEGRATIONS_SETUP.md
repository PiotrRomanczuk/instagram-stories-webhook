# Integrations Setup Guide

Complete step-by-step instructions for every external service used by ShortsCannon.
Follow this guide in order — some services depend on others being set up first.

---

## Table of Contents

1. [Prerequisites — local tools](#1-prerequisites--local-tools)
2. [Supabase — database](#2-supabase--database)
3. [Google Cloud — OAuth + Drive](#3-google-cloud--oauth--drive)
4. [NextAuth — session auth](#4-nextauth--session-auth)
5. [Redis — job queue](#5-redis--job-queue)
6. [Cloudflare Tunnel — stable public URL](#6-cloudflare-tunnel--stable-public-url)
7. [Meta / Instagram API](#7-meta--instagram-api)
8. [TikTok API](#8-tiktok-api)
9. [Anthropic API — Claude Haiku](#9-anthropic-api--claude-haiku)
10. [Fal.ai — Flux image generation](#10-falai--flux-image-generation)
11. [ComfyUI — local GPU inference](#11-comfyui--local-gpu-inference)
12. [Resend — email notifications](#12-resend--email-notifications)
13. [Pixabay — royalty-free audio](#13-pixabay--royalty-free-audio)
14. [Complete .env checklist](#14-complete-env-checklist)

---

## 1. Prerequisites — local tools

Install these before anything else.

### Node.js 20+
```bash
node -v   # must be ≥ 20
```
If not: https://nodejs.org/en/download — use the LTS installer.

### FFmpeg
Required for video composition (Marszal pipeline, UC-03).
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt update && sudo apt install -y ffmpeg

# Verify
ffmpeg -version
```

### Docker Desktop
Required to run Redis and the Cloudflare tunnel locally.
- Download: https://www.docker.com/products/docker-desktop/
- Verify: `docker -v && docker compose version`

### PM2
Process manager — keeps the Next.js web server and BullMQ worker running.
```bash
npm install -g pm2
pm2 -v   # should print a version number
```

---

## 2. Supabase — database

### 2.1 Create a project
1. Go to https://supabase.com → **Sign in** (GitHub is easiest).
2. Click **New project**.
3. Choose an **Organization** (or create one — free tier allows 2 projects).
4. **Name**: `shortscannon` (or any name you like).
5. **Database password**: generate a strong password and save it.
6. **Region**: pick the one closest to your home.
7. Click **Create new project** — takes ~2 minutes.

### 2.2 Collect your credentials
In your project dashboard → **Project Settings** → **API**:

| Env var | Where to find it |
|---------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API keys" → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys" → `service_role` (keep this secret) |

### 2.3 Run migrations
```bash
# From the project root
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF   # from the URL: xxxx.supabase.co
npx supabase db push
```
Or paste each file in `supabase/migrations/` into the Supabase **SQL Editor** in order.

### 2.4 Enable Google Auth in Supabase (optional — NextAuth handles auth, but Supabase needs it for RLS)
Dashboard → **Authentication** → **Providers** → **Google** → enable it.
You'll fill in Client ID and Secret after completing section 3.

---

## 3. Google Cloud — OAuth + Drive

Both Google sign-in (NextAuth) and Google Drive storage use the same Google Cloud project and the same OAuth 2.0 credentials. Set this up once.

### 3.1 Create a Google Cloud project
1. Go to https://console.cloud.google.com/
2. Top bar → project dropdown → **New Project**.
3. **Name**: `shortscannon` → **Create**.
4. Make sure the new project is selected in the top bar.

### 3.2 Enable the APIs you need
Go to **APIs & Services** → **Library** and enable:
- **Google Drive API** (for file storage)
- **Google+ API** or **Google People API** (for user profile in OAuth — usually auto-enabled)

Search for each, click it, click **Enable**.

### 3.3 Configure the OAuth consent screen
**APIs & Services** → **OAuth consent screen**:
1. **User type**: External → **Create**.
2. **App name**: `ShortsCannon`
3. **User support email**: your Gmail address
4. **Developer contact**: your Gmail address
5. Click **Save and Continue**.
6. **Scopes** → **Add or Remove Scopes** → add:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive` (for Drive access)
7. Click **Update** → **Save and Continue**.
8. **Test users**: add your own Gmail address → **Save and Continue** → **Back to Dashboard**.

> **Note**: With External type, only test users can authorize while the app is in "Testing" mode.
> For production use (publishing to real accounts), you'll need to submit for verification — but for personal/client use, Testing mode is fine.

### 3.4 Create OAuth 2.0 credentials
**APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**:

1. **Application type**: Web application
2. **Name**: `shortscannon-web`
3. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `https://your-tunnel-subdomain.yourdomain.com` ← add after Cloudflare Tunnel setup (section 6)
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-tunnel-subdomain.yourdomain.com/api/auth/callback/google` ← add after tunnel setup
5. Click **Create**.

Download the JSON or copy the values:

| Env var | Value |
|---------|-------|
| `GOOGLE_CLIENT_ID` | "Your Client ID" (ends in `.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | "Your Client Secret" |

> These same credentials are used for NextAuth sign-in AND Google Drive — no need for two separate credential sets.

### 3.5 Get the Google Drive refresh token
Run the setup script once:
```bash
npx tsx scripts/setup-drive.ts
```
1. It prints a URL — open it in your browser.
2. Sign in with the Google account that owns the Drive where files will be stored.
3. Grant all requested permissions.
4. Copy the code shown and paste it back in the terminal.
5. It prints `GOOGLE_REFRESH_TOKEN=...` — copy this to `.env`.

### 3.6 Create the root Drive folder
1. Go to https://drive.google.com
2. Create a new folder: **ShortsCannon** (or any name).
3. Open the folder — the URL will look like:
   `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ`
4. Copy the folder ID (the long string after `/folders/`).

| Env var | Value |
|---------|-------|
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | the folder ID from the URL |

The app will auto-create subfolders (`stories/`, `composed/`, etc.) inside this root on first run.

---

## 4. NextAuth — session auth

### 4.1 Generate a secret
```bash
openssl rand -base64 32
```
Copy the output.

| Env var | Value |
|---------|-------|
| `NEXTAUTH_SECRET` | output of the command above |
| `AUTH_SECRET` | same value (used by newer Auth.js versions) |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) or your tunnel URL (prod) |

### 4.2 Whitelist your email
The app uses an `email_whitelist` table to control who can log in.
After running migrations, insert your email:
```sql
-- In Supabase SQL Editor
INSERT INTO email_whitelist (email) VALUES ('your@gmail.com');
```

---

## 5. Redis — job queue

Redis runs inside Docker via docker-compose. No account or API key needed.

### 5.1 Start Redis
```bash
docker compose up -d redis
docker compose ps   # redis should show "healthy"
```

### 5.2 Verify the connection
```bash
docker exec -it shortscannon-redis redis-cli ping
# Expected output: PONG
```

| Env var | Value |
|---------|-------|
| `REDIS_URL` | `redis://localhost:6379` (default — matches docker-compose.yml) |

Redis data is persisted to a Docker volume (`redis-data`) — it survives container restarts.

---

## 6. Cloudflare Tunnel — stable public URL

Meta and TikTok OAuth require a publicly reachable HTTPS redirect URI.
Cloudflare Tunnel gives you a stable subdomain without port forwarding or a fixed IP.

### 6.1 Create a Cloudflare account
Go to https://dash.cloudflare.com → **Sign up** (free tier is enough).

### 6.2 Add your domain to Cloudflare (if you have one)
If you own a domain (e.g. `romanczuk.dev`):
1. Dashboard → **Add a Site** → enter your domain.
2. Follow instructions to update nameservers at your registrar.
3. Wait for DNS propagation (~5 min to a few hours).

If you don't have a domain, Cloudflare can give you a free `*.trycloudflare.com` subdomain (no account required, but less stable). For OAuth callbacks you want a permanent URL, so a custom domain is recommended.

### 6.3 Install cloudflared CLI
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

### 6.4 Authenticate cloudflared
```bash
cloudflared tunnel login
# Opens your browser — log in with your Cloudflare account
```
This saves credentials to `~/.cloudflared/cert.pem`.

### 6.5 Create the tunnel
```bash
cloudflared tunnel create shortscannon
```
This prints a tunnel ID (UUID) and creates a credentials JSON file at:
`~/.cloudflared/<TUNNEL_ID>.json`

### 6.6 Configure the tunnel
```bash
cp cloudflared/config.yml.example cloudflared/config.yml
```
Edit `cloudflared/config.yml`:
```yaml
tunnel: YOUR_TUNNEL_ID           # from step 6.5
credentials-file: /etc/cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: shortcuts.yourdomain.com   # your chosen subdomain
    service: http://host.docker.internal:3000
  - service: http_status:404
```

Copy the credentials JSON into the cloudflared folder:
```bash
cp ~/.cloudflared/<TUNNEL_ID>.json cloudflared/
```

### 6.7 Route DNS to the tunnel
```bash
cloudflared tunnel route dns shortscannon shortcuts.yourdomain.com
```
This adds a CNAME in your Cloudflare DNS automatically.

### 6.8 Start the tunnel
```bash
docker compose up -d tunnel
```
Visit `https://shortcuts.yourdomain.com` — you should see the Next.js app.

### 6.9 Update Google OAuth redirect URIs
Go back to Google Cloud → **Credentials** → your OAuth client → add:
- Authorized JavaScript origin: `https://shortcuts.yourdomain.com`
- Authorized redirect URI: `https://shortcuts.yourdomain.com/api/auth/callback/google`

Update `NEXTAUTH_URL=https://shortcuts.yourdomain.com` in `.env` when running behind the tunnel.

---

## 7. Meta / Instagram API

### 7.1 Create a Facebook Developer account
Go to https://developers.facebook.com → **Get Started** (log in with Facebook).

### 7.2 Create an app
1. **My Apps** → **Create App**.
2. **Use case**: select **Other** → **Next**.
3. **App type**: **Business** → **Next**.
4. Fill in:
   - **App name**: `ShortsCannon`
   - **App contact email**: your email
   - **Business portfolio**: can leave blank for now
5. Click **Create App**.

### 7.3 Add the Instagram product
In your app dashboard → **Add a Product** → find **Instagram** → **Set Up**.

### 7.4 Add the Facebook Login product (for OAuth flow)
**Add a Product** → **Facebook Login** → **Set Up** → **Web**.
- **Site URL**: `https://shortcuts.yourdomain.com`

In **Facebook Login** → **Settings**:
- **Valid OAuth Redirect URIs**: add `https://shortcuts.yourdomain.com/api/auth/callback/facebook`

### 7.5 Collect your credentials
App Dashboard → **Settings** → **Basic**:

| Env var | Value |
|---------|-------|
| `FACEBOOK_APP_ID` | "App ID" |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | same App ID |
| `FACEBOOK_APP_SECRET` | "App Secret" (click Show) |
| `FACEBOOK_REDIRECT_URI` | `https://shortcuts.yourdomain.com/api/auth/callback/facebook` |

### 7.6 Required permissions
Your app needs these Instagram permissions. Request them under **App Review** → **Permissions and Features**:

| Permission | Why |
|------------|-----|
| `instagram_basic` | Read profile info |
| `instagram_content_publish` | Publish photos/videos/reels/stories |
| `instagram_manage_insights` | Read post metrics |
| `pages_show_list` | List Facebook Pages linked to the account |
| `pages_read_engagement` | Read Page engagement for linked accounts |

For development, you can test with your own Instagram account without app review. For publishing to client accounts, you'll need to submit for review.

See `docs/META_PERMISSIONS.md` for the full permissions reference.

### 7.7 Set up a Test User (development)
**Roles** → **Test Users** → **Add** → create a test user.
You can link a real Instagram Business/Creator account to the test user for development testing.

### 7.8 Token encryption key
The app encrypts stored Instagram tokens with AES-256-GCM. Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Env var | Value |
|---------|-------|
| `TOKEN_ENCRYPTION_KEY` | 64-character hex string from command above |

---

## 8. TikTok API

### 8.1 Create a TikTok developer account
Go to https://developers.tiktok.com → **Log In** (use your TikTok account).

### 8.2 Create an app
1. **My Apps** → **Connect an app**.
2. **App name**: `ShortsCannon`
3. **Platform**: Web
4. **Website**: `https://shortcuts.yourdomain.com`
5. Agree to terms → **Create**.

### 8.3 Configure OAuth redirect
In your app settings:
- **Redirect domain**: `shortcuts.yourdomain.com`
- Add redirect URI: `https://shortcuts.yourdomain.com/api/auth/link-tiktok/callback`

### 8.4 Request the required scopes
Under **Products** → **Login Kit** → enable and request:
- `user.info.basic` — profile info
- `video.upload` — upload videos
- `video.publish` — publish (Direct Post)

> **Note**: `video.publish` (Direct Post) requires TikTok approval. Submit an app review request explaining your use case. Standard review takes 1-2 weeks.

### 8.5 Collect credentials
App settings → **Keys and credentials**:

| Env var | Value |
|---------|-------|
| `TIKTOK_CLIENT_KEY` | "Client key" |
| `TIKTOK_CLIENT_SECRET` | "Client secret" |

---

## 9. Anthropic API — Claude Haiku

Used to generate horoscope text (80-120 words per zodiac sign, 12 signs = ~1000 tokens per run).

### 9.1 Create an account
Go to https://console.anthropic.com → **Sign up**.

### 9.2 Add billing
**Settings** → **Billing** → add a payment method.
Claude Haiku is very cheap (~$0.25 per million input tokens). A full horoscope run costs < $0.01.

### 9.3 Create an API key
**Settings** → **API Keys** → **Create Key**:
- **Name**: `shortscannon`
- Copy the key immediately (shown only once).

| Env var | Value |
|---------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |

---

## 10. Fal.ai — Flux image generation

Used as the cloud fallback for AI image generation when ComfyUI (section 11) is unavailable.
~$0.003 per image (Flux Schnell).

### 10.1 Create an account
Go to https://fal.ai → **Sign up** (GitHub is easiest).

### 10.2 Add billing
**Dashboard** → **Billing** → add a payment method.
$5 credit is enough to generate ~1600 images.

### 10.3 Create an API key
**Dashboard** → **Keys** → **Add Key**:
- **Name**: `shortscannon`
- Copy the key.

| Env var | Value |
|---------|-------|
| `FAL_API_KEY` | `fal-...` |

---

## 11. ComfyUI — local GPU inference

ComfyUI runs on your second PC (AMD RX 7700 XT, 12GB VRAM) and serves as the primary
image generation backend. Fal.ai is the fallback if ComfyUI is unreachable.

### 11.1 Install on the second PC

**Windows:**
```powershell
# Install Python 3.11 (https://python.org/downloads)
# Install Git (https://git-scm.com)

git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI

# Install ROCm PyTorch for AMD GPUs
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.0

pip install -r requirements.txt
```

**Linux (Ubuntu):**
```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.0
pip install -r requirements.txt
```

### 11.2 Download a model
Download an SDXL model to `ComfyUI/models/checkpoints/`:
- **Recommended**: SDXL Base 1.0 — https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
  - Download `sd_xl_base_1.0.safetensors` (~6.9 GB)

### 11.3 Start ComfyUI with network access
```bash
# In the ComfyUI directory
python main.py --listen 0.0.0.0 --port 8188
```
The `--listen 0.0.0.0` flag makes it accessible from other machines on your local network.

### 11.4 Find the second PC's IP address
On the second PC:
```bash
# Windows
ipconfig | findstr "IPv4"

# Linux/Mac
ip addr show | grep "inet " | grep -v 127.0.0.1
```
Note the local IP (e.g. `192.168.1.42`).

### 11.5 Verify from the main PC
```bash
curl http://192.168.1.42:8188/system_stats
# Should return JSON with GPU info
```

| Env var | Value |
|---------|-------|
| `COMFYUI_URL` | `http://192.168.1.42:8188` (use actual IP) |

> **Tip**: Set a static IP for the second PC in your router's DHCP settings so it never changes.

---

## 12. Resend — email notifications

Used for failure alerts (publish errors, token expiry warnings).

### 12.1 Create an account
Go to https://resend.com → **Sign up**.

### 12.2 Add and verify your domain (recommended)
**Domains** → **Add Domain** → enter your domain → follow the DNS instructions.
This allows sending from `noreply@yourdomain.com`.

If you don't have a domain, you can send from `onboarding@resend.dev` during development (limited to your own email address as recipient).

### 12.3 Create an API key
**API Keys** → **Create API Key**:
- **Name**: `shortscannon`
- **Permission**: Sending access
- Copy the key.

| Env var | Value |
|---------|-------|
| `RESEND_API_KEY` | `re_...` |

---

## 13. Pixabay — royalty-free audio

Used to fetch background music for Marszal pipeline videos (UC-03).

### 13.1 Create an account
Go to https://pixabay.com → **Join** (free).

### 13.2 Get an API key
Go to https://pixabay.com/api/docs/ — your API key is shown at the top after logging in.

| Env var | Value |
|---------|-------|
| `PIXABAY_API_KEY` | shown on the API docs page |

---

## 14. Complete .env checklist

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

### Infrastructure
```env
REDIS_URL=redis://localhost:6379
```

### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Auth (NextAuth)
```env
NEXTAUTH_URL=https://shortcuts.yourdomain.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
AUTH_SECRET=<same as NEXTAUTH_SECRET>
```

### Google OAuth + Drive (same credentials)
```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
AUTH_GOOGLE_ID=<same as GOOGLE_CLIENT_ID>
AUTH_GOOGLE_SECRET=<same as GOOGLE_CLIENT_SECRET>
GOOGLE_REFRESH_TOKEN=1//...
GOOGLE_DRIVE_ROOT_FOLDER_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

### Instagram / Meta
```env
FACEBOOK_APP_ID=123456789
NEXT_PUBLIC_FACEBOOK_APP_ID=123456789
FACEBOOK_APP_SECRET=abc123...
FACEBOOK_REDIRECT_URI=https://shortcuts.yourdomain.com/api/auth/callback/facebook
TOKEN_ENCRYPTION_KEY=<64 hex chars from crypto.randomBytes(32).toString('hex')>
```

### TikTok
```env
TIKTOK_CLIENT_KEY=awxxxxxxxxxxxxxxxx
TIKTOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TIKTOK_PIPELINE_ENABLED=true
TIKTOK_MIN_ENGAGEMENT_SCORE=100
TIKTOK_STORIES_PER_VIDEO=7
```

### AI & Generation
```env
ANTHROPIC_API_KEY=sk-ant-...
FAL_API_KEY=fal-...
COMFYUI_URL=http://192.168.1.42:8188
OPENAI_API_KEY=sk-...   # optional, for DALL-E fallback
```

### Notifications
```env
RESEND_API_KEY=re_...
```

### Audio
```env
PIXABAY_API_KEY=...
```

### Security
```env
CRON_SECRET=<openssl rand -base64 32>
WEBHOOK_SECRET=<openssl rand -base64 32>
```

### Optional
```env
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
DATA_DIR=./data
ENABLE_LOCAL_CRON=false
```

---

## Starting everything

Once all env vars are filled in:

```bash
# 1. Start infrastructure (Redis + Cloudflare tunnel)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Run DB migrations
npx supabase db push

# 4. Build the app
npm run build

# 5. Start web + worker with PM2
pm2 start ecosystem.config.js

# 6. Save PM2 process list (auto-restart on machine reboot)
pm2 save
pm2 startup   # follow the printed command

# 7. Check health
curl http://localhost:3000/api/health
```

### Useful PM2 commands
```bash
pm2 status          # see running processes
pm2 logs web        # Next.js logs
pm2 logs worker     # BullMQ worker logs
pm2 restart web     # restart web server
pm2 restart worker  # restart worker
pm2 stop all        # stop everything
```
