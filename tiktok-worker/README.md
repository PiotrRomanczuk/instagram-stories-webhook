# tiktok-worker

Host-side worker that drives a USB-tethered Samsung phone (S24) to publish TikTok Stories from the `content_items` queue in Supabase. The Next.js app does not run this — it lives on a Mac mini / Raspberry Pi 5 that the phone stays plugged into.

> **TikTok ToS warning:** TikTok prohibits automated account interaction. This worker is humanised to reduce detection risk but cannot eliminate it. Use at your own risk on a non-essential account.

## Architecture

```
Supabase content_items (publishing_channel='tiktok-device', publishing_status='scheduled')
        │
        ▼  every 30s
┌───────────────────────────┐         USB         ┌──────────────────┐
│ Python worker             │ ◄──── adb ────────► │ Samsung S24      │
│ - claim job               │                     │ TikTok app       │
│ - adb push media          │                     │ Logged in        │
│ - drive Story UI          │                     │                  │
│ - heartbeat every 60s     │                     │                  │
└───────────────────────────┘                     └──────────────────┘
```

## Bring-up

### 1. Phone

Follow the checklist in `docs/phone-bring-up.md` (in the main repo). Critical items:

- USB debugging on, "Stay awake" on, "Don't keep activities" **OFF**.
- TikTok logged in and primed (dismiss every first-run prompt manually).
- Disable Play Store auto-updates for TikTok.

### 2. Host

```bash
cd tiktok-worker
uv sync --extra dev          # or: pip install -e '.[dev]'
cp .env.example .env         # then fill in
adb devices                  # confirm your phone shows up
```

### 3. Configure `.env`

```dotenv
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>           # NEVER commit
DEVICE_SERIAL=R3CN10XXXXX                         # from `adb devices`
DEVICE_ID=<uuid from tiktok_devices.id>           # register first via the admin API
POLL_INTERVAL_SEC=30
DAILY_POST_CAP=10
LOCAL_TZ=Europe/Warsaw
```

### 4. Register the device

```bash
curl -X POST https://<your-host>/api/tiktok/devices \
  -H "Cookie: <admin-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"deviceSerial":"R3CN10XXXXX","phoneLabel":"Studio S24","tiktokUsername":"yourhandle"}'
```

Copy the returned `id` into `.env` as `DEVICE_ID`.

### 5. Run

```bash
# Smoke test — opens TikTok, takes screenshot, exits.
uv run python -m tiktok_worker.main --once --dry-run

# Shadow mode — full session loop with NO posts. Use for a few days
# to verify the humaniser before going live.
uv run python -m tiktok_worker.main --shadow-mode

# Real run
uv run python -m tiktok_worker.main
```

### 6. Autostart

`scripts/install-host.sh` writes a launchd plist (macOS) or systemd unit (Linux). The worker is supposed to be running 24/7 — health checks on the Next.js side will alert if the heartbeat goes stale.

## Layout

```
tiktok_worker/
  config.py         # pydantic Settings
  queue.py          # Supabase claim / mark published / heartbeat
  media.py          # download + adb push + MediaScanner
  device.py         # uiautomator2 connection, wake/unlock
  story_flow.py     # Story create-post sequence
  detect.py         # screenshot → posted | rejected | login_required | unknown
  humanize/
    session.py      # session-type chooser, diurnal model
    tap.py          # off-centre Gaussian taps inside bbox
    swipe.py        # Bézier-curve swipes with ease-in/out velocity
    browse.py       # idle-browse loop (likes, back-scrolls, profile peeks)
    timing.py       # context-aware delay distributions
    profile.py      # per-device behaviour profile
  main.py           # CLI + poll loop
tests/              # pytest distribution-shape + queue-claim tests
```

## Why this design

- **Pull-based** so the host owns retries; the phone is dumb.
- **Same `content_items` queue** so scheduling, deduplication, and admin tooling work for both channels.
- **Humanisation in its own package** so each layer (taps, swipes, sessions) is unit-testable independently.
- **Shadow mode** so behaviour can be validated before any real post.
