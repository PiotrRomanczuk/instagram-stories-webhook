# Work Time Log Generator

Regenerates `docs/work-time-log.md` and `docs/work-time-log.csv` from the git commit history. Produces a client-ready work report with executive summary, version history, and detailed session/commit logs.

## When to Use

- After a batch of work is done (end of day/week)
- Before sending a progress update to the client
- When preparing an invoice or timesheet

## Workflow

### 1. Run the generator script

```bash
python3 docs/generate-work-time-log.py
```

This reads the full git history and tag list, then writes both output files.

### 2. Review the output

Open `docs/work-time-log.md` and verify:
- Executive summary reads well for a non-technical audience
- Version history is up to date
- Session times look reasonable

### 3. Share with client

- **Markdown**: Share directly or convert to PDF
- **CSV**: Import into Google Sheets or Excel for custom filtering

## Configuration

The generator uses these defaults (editable at the top of the script):

| Setting | Default | Meaning |
|---------|---------|---------|
| `GAP_HOURS` | 2 | Hours between commits to start a new session |
| `LEAD_MINUTES` | 15 | Minutes added before first commit of each session |

## Output Files

| File | Purpose |
|------|---------|
| `docs/work-time-log.md` | Client-facing report (executive summary + full detail) |
| `docs/work-time-log.csv` | Spreadsheet data (sessions + commits + versions) |
