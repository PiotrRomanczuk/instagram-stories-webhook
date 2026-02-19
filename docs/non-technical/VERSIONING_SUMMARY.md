# Understanding Software Versions: A Client's Guide

This document explains our versioning system and what the current version (`v0.21.1`) represents in the lifecycle of the application.

---

## 🔢 How We Number Versions

We use a standard industry practice called **Semantic Versioning**. It uses three numbers (e.g., `1.5.2`) to track progress:

1.  **Major Version (The first number)**:
    *   Examples: `1.0.0`, `2.0.0`
    *   **Meaning**: A massive milestone. `1.0.0` usually means the "Official Public Launch" or a commercially ready product.
    *   **For us**: We are currently at `0`, meaning we are in the **"Initial Development & Beta"** phase. The foundation is being built and refined.

2.  **Minor Version (The middle number)**:
    *   Examples: `0.20.0`, `0.21.0`
    *   **Meaning**: New features or significant capabilities added.
    *   **For us**: `21` means we have delivered **21 significant feature iterations** since starting. This shows steady, continuous progress.

3.  **Patch Version (The last number)**:
    *   Examples: `0.21.0` → `0.21.1`
    *   **Meaning**: Small fixes, polish, or document updates. No nwe functionality, just making the existing features work better.
    *   **For us**: `.1` indicates we recently did a round of polish or bug fixing on the latest features.

---

## 🚀 Current Status: `v0.21.1`

**Latest Release:** February 2026

We are currently at version **0.21.1**. Here is what this specific version represents:

### ✅ What's Included?
*   **Core Functionality Complete**: Users can login, link accounts, submit memes, and the system auto-publishes them to Instagram.
*   **Reliability**: Automated testing (E2E) is in place to ensure the "Happy Path" (the main user journey) works perfectly.
*   **Mobile Experience**: Recent updates included mobile-friendly swipe gestures for easier review on phones.
*   **Documentation**: Comprehensive guides for both users and developers are now available.

### 🚧 Why not "v1.0" yet?
In software, `v1.0` is a stamp of "Production Perfection." We are very close, but `v0.x` allows us to:
*   Rapidly change features based on early feedback without worrying about "breaking" established rules.
*   Finalize the user interface based on real-world usage.
*   Perform stress testing before opening the floodgates.

---

## 📅 The Road to v1.0.0

To move from `v0.21.x` to `v1.0.0` (Official Launch), we typically look for:
1.  **Stability**: No critical bugs for a set period (e.g., 2 weeks).
2.  **Feature Freeze**: No new features added; only polish.
3.  **User Acceptance**: The client (you) confirms all core requirements are met.

**Current State**: We are in the **Final Polish & Documentation** phase. The system is fully functional and ready for beta testing with real users.
