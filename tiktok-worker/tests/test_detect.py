from tiktok_worker.detect import DetectOutcome, classify_text


def test_detects_posted_toast() -> None:
    assert classify_text("Posted to your story") is DetectOutcome.POSTED


def test_detects_login_screen() -> None:
    assert classify_text("Sign up to TikTok") is DetectOutcome.LOGIN_REQUIRED


def test_blocked_beats_posted_if_both_present() -> None:
    # If a captcha overlays a success state, we want to treat as blocked.
    text = "Verify it's you. Posted to your story."
    assert classify_text(text) is DetectOutcome.BLOCKED


def test_unknown_when_no_hints() -> None:
    assert classify_text("For You") is DetectOutcome.UNKNOWN
