"""Media download + adb push + MediaScanner refresh."""

from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path

import httpx

log = logging.getLogger(__name__)

PHONE_TARGET_DIR = "/sdcard/DCIM/Camera"


def push_media_to_device(
    serial: str,
    media_url: str,
    *,
    suffix: str,
) -> str:
    """Download the processed media, adb-push to /sdcard/DCIM/Camera, return phone path."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tf:
        local_path = Path(tf.name)

    log.debug("Downloading media: %s -> %s", media_url, local_path)
    with httpx.stream("GET", media_url, follow_redirects=True, timeout=120) as r:
        r.raise_for_status()
        with local_path.open("wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)

    remote_path = f"{PHONE_TARGET_DIR}/{local_path.name}"
    log.debug("adb push %s %s", local_path, remote_path)
    subprocess.run(
        ["adb", "-s", serial, "push", str(local_path), remote_path],
        check=True,
        capture_output=True,
    )
    # Tell the gallery the file exists so it shows up immediately.
    subprocess.run(
        [
            "adb", "-s", serial, "shell",
            "am", "broadcast",
            "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
            "-d", f"file://{remote_path}",
        ],
        check=True,
        capture_output=True,
    )
    local_path.unlink(missing_ok=True)
    return remote_path
