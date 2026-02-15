---
name: webapp-testing
description: Web application testing toolkit using Playwright for E2E testing. Use when writing automated tests for the Guitar CRM application, testing user flows, or debugging UI issues. Complements existing Cypress tests with Playwright capabilities. Leverages both Playwright MCP (rich introspection) and Playwright CLI (token-efficient automation).
---

# Web Application Testing Toolkit

## Overview

Test Guitar CRM web application using Playwright for comprehensive E2E testing. Two Playwright tools are available as MCP servers:

| Tool | Best For | How It Works |
|------|----------|--------------|
| **Playwright MCP** (`playwright`) | Exploratory testing, debugging, long-running workflows | MCP server with rich introspection via accessibility snapshots, persistent state |
| **Playwright CLI** | Fast scripted automation, CI pipelines, quick checks | Shell commands via `npx @playwright/cli@latest`, token-efficient, session management |

## Playwright CLI Quick Reference

The CLI is available via `npx @playwright/cli@latest` (run through Bash). It is NOT an MCP server - use it as a shell command.

### Essential Commands

```bash
# Browser lifecycle
playwright-cli open http://localhost:3000     # Open browser at URL
playwright-cli snapshot                        # Get page accessibility snapshot (element refs)
playwright-cli close                           # Close browser

# Navigation
playwright-cli goto http://localhost:3000/dashboard
playwright-cli go-back
playwright-cli reload

# Interaction (use ref numbers from snapshot)
playwright-cli click <ref>
playwright-cli fill <ref> "text value"
playwright-cli type "text to type"
playwright-cli select <ref> "option-value"
playwright-cli check <ref>
playwright-cli hover <ref>

# Capture
playwright-cli screenshot                     # Full page screenshot
playwright-cli screenshot <ref>               # Element screenshot
playwright-cli pdf                            # Save page as PDF

# Session management (parallel sessions)
playwright-cli -s=admin open http://localhost:3000
playwright-cli -s=student open http://localhost:3000
playwright-cli list                            # List all sessions
playwright-cli close-all                       # Close all sessions

# Storage/Auth state
playwright-cli state-save auth-teacher.json    # Save auth state
playwright-cli state-load auth-teacher.json    # Restore auth state

# DevTools
playwright-cli console                         # View console messages
playwright-cli network                         # List network requests
playwright-cli tracing-start                   # Start trace recording
playwright-cli tracing-stop                    # Stop and save trace

# Network mocking
playwright-cli route "*/api/lessons*" --body='[]' --status=200
playwright-cli route-list
playwright-cli unroute
```

### Session Workflow for Multi-Role Testing

```bash
# Test as teacher in one session
playwright-cli -s=teacher open http://localhost:3000/login
playwright-cli -s=teacher snapshot
playwright-cli -s=teacher fill <email-ref> "teacher@example.com"
playwright-cli -s=teacher fill <pass-ref> "test123_teacher"
playwright-cli -s=teacher click <submit-ref>
playwright-cli -s=teacher state-save auth-teacher.json

# Test as student in parallel session
playwright-cli -s=student open http://localhost:3000/login
playwright-cli -s=student fill <email-ref> "student@example.com"
playwright-cli -s=student fill <pass-ref> "test123_student"
playwright-cli -s=student click <submit-ref>
playwright-cli -s=student state-save auth-student.json

# Reuse saved auth later
playwright-cli -s=teacher state-load auth-teacher.json
playwright-cli -s=teacher goto http://localhost:3000/dashboard
```

## Playwright MCP Tools Reference

The Playwright MCP server exposes these tool categories through Claude's tool system:

- **browser_navigate** - Navigate to URLs
- **browser_click** / **browser_type** / **browser_fill** - Interact with elements
- **browser_snapshot** - Get accessibility tree (primary way to see page state)
- **browser_screenshot** - Take visual screenshots
- **browser_tab_list** / **browser_tab_new** / **browser_tab_close** - Tab management
- **browser_evaluate** - Execute JavaScript in page context

Use MCP tools when you need iterative exploration with rich context preservation.

## Testing Patterns for Guitar CRM

### Pattern 1: Login + Verify Dashboard

```bash
# Using CLI
playwright-cli open http://localhost:3000/login
playwright-cli snapshot                          # Find form refs
playwright-cli fill <email-ref> "teacher@example.com"
playwright-cli fill <pass-ref> "test123_teacher"
playwright-cli click <submit-ref>
playwright-cli snapshot                          # Verify dashboard content
```

### Pattern 2: Test CRUD Operations (Lessons)

```bash
playwright-cli -s=crud state-load auth-teacher.json
playwright-cli -s=crud goto http://localhost:3000/dashboard/lessons/new
playwright-cli -s=crud snapshot
# Fill lesson form fields using refs from snapshot
playwright-cli -s=crud fill <student-ref> "Test Student"
playwright-cli -s=crud fill <date-ref> "2025-02-15"
playwright-cli -s=crud click <submit-ref>
playwright-cli -s=crud snapshot                  # Verify success message
```

### Pattern 3: Visual Regression

```bash
playwright-cli screenshot screenshots/dashboard-before.png
# ... make changes ...
playwright-cli screenshot screenshots/dashboard-after.png
```

### Pattern 4: API + UI Combined Testing

```bash
# Mock API response
playwright-cli route "*/api/students/needs-attention*" --body='[{"id":1,"name":"Test"}]'
playwright-cli goto http://localhost:3000/dashboard
playwright-cli snapshot                          # Verify UI renders mock data
playwright-cli unroute                           # Clear mocks
```

### Pattern 5: Debug Failing UI

```bash
playwright-cli open http://localhost:3000/dashboard
playwright-cli console error                     # Check for JS errors
playwright-cli network                           # Check for failed requests
playwright-cli tracing-start                     # Record trace
# ... reproduce the issue ...
playwright-cli tracing-stop                      # Save trace for analysis
```

## Python Test Scripts (Existing Cypress Complement)

```python
from playwright.sync_api import sync_playwright

def test_login_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000/login")
        page.wait_for_load_state('networkidle')
        page.fill('input[name="email"]', 'student@example.com')
        page.fill('input[name="password"]', 'test123_student')
        page.click('button[type="submit"]')
        page.wait_for_url('**/dashboard**')
        assert 'dashboard' in page.url
        browser.close()
```

### Helper Functions

```python
def login_as_student(page):
    page.goto("http://localhost:3000/login")
    page.fill('input[name="email"]', 'student@example.com')
    page.fill('input[name="password"]', 'test123_student')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**')

def login_as_teacher(page):
    page.goto("http://localhost:3000/login")
    page.fill('input[name="email"]', 'teacher@example.com')
    page.fill('input[name="password"]', 'test123_teacher')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**')

def login_as_admin(page):
    page.goto("http://localhost:3000/login")
    page.fill('input[name="email"]', 'p.romanczuk@gmail.com')
    page.fill('input[name="password"]', 'test123_admin')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**')
```

## Dev Credentials (Local Only)

| Role | Email | Password |
|------|-------|----------|
| Admin | p.romanczuk@gmail.com | test123_admin |
| Teacher | teacher@example.com | test123_teacher |
| Student | student@example.com | test123_student |

## Best Practices

1. **Use `snapshot` before interacting** - Get element refs from the accessibility tree
2. **Use sessions for multi-role testing** - Test teacher/student views simultaneously
3. **Save auth state** - Avoid re-logging in for every test scenario
4. **Use `console` and `network`** - First steps when debugging failures
5. **Prefer CLI for scripted flows** - More token-efficient than MCP for sequential actions
6. **Prefer MCP for exploration** - Better context when investigating unknown page state
7. **Use data-testid selectors** in Python scripts for reliability
8. **Wait for network idle** before assertions in Python tests
9. **Run headless in CI**, headed for local debugging
10. **Clean up sessions** with `close-all` when done

## Dependencies

- **Playwright MCP**: Configured as `playwright` MCP server (accessible as Claude tools)
- **Playwright CLI**: Installed globally via `npx @playwright/cli@latest` (use via Bash tool)
- **Python tests** (optional): `pip install playwright && playwright install`

## Integration with Existing Cypress Tests

This skill complements the existing Cypress E2E tests in `/cypress`. Use Playwright for:
- Interactive browser debugging via CLI/MCP
- Cross-browser testing (Chromium, Firefox, WebKit)
- Multi-session role-based testing
- Network mocking and tracing
- API testing alongside UI tests
- Visual regression testing
