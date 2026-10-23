#!/usr/bin/env bash
set -euo pipefail

# install-host.sh — bring up the host machine for the tiktok-worker
#
# What this does:
#   1. Verifies adb is installed and the phone is reachable.
#   2. Installs the worker package + dev deps with uv (falls back to pip).
#   3. Sets up an autostart unit (systemd on Linux, launchd on macOS).
#
# Re-run this script after upgrading the worker or replacing the phone.

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

cd "$ROOT"

echo "==> Checking adb..."
if ! command -v adb >/dev/null 2>&1; then
    echo "adb not found. Install with:"
    echo "  macOS:  brew install --cask android-platform-tools"
    echo "  Linux:  sudo apt-get install android-tools-adb"
    exit 1
fi

echo "==> Listing connected Android devices..."
adb devices

echo "==> Installing worker..."
if command -v uv >/dev/null 2>&1; then
    uv sync --extra dev
else
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    pip install -e '.[dev]'
fi

case "$(uname -s)" in
    Darwin)
        PLIST="$HOME/Library/LaunchAgents/com.tiktok-worker.plist"
        cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.tiktok-worker</string>
    <key>ProgramArguments</key>
    <array>
        <string>$ROOT/.venv/bin/python</string>
        <string>-m</string>
        <string>tiktok_worker.main</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$ROOT</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>$ROOT/tiktok-worker.err.log</string>
    <key>StandardOutPath</key>
    <string>$ROOT/tiktok-worker.out.log</string>
</dict>
</plist>
EOF
        launchctl unload "$PLIST" 2>/dev/null || true
        launchctl load "$PLIST"
        echo "==> Installed launchd agent at $PLIST"
        ;;
    Linux)
        UNIT="$HOME/.config/systemd/user/tiktok-worker.service"
        mkdir -p "$(dirname "$UNIT")"
        cat > "$UNIT" <<EOF
[Unit]
Description=TikTok phone worker
After=network.target

[Service]
WorkingDirectory=$ROOT
ExecStart=$ROOT/.venv/bin/python -m tiktok_worker.main
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF
        systemctl --user daemon-reload
        systemctl --user enable --now tiktok-worker.service
        echo "==> Installed systemd unit at $UNIT"
        ;;
    *)
        echo "Unsupported OS: $(uname -s) — install autostart manually."
        ;;
esac

echo "==> Done. Tail logs with: tail -f $ROOT/tiktok-worker.out.log"
