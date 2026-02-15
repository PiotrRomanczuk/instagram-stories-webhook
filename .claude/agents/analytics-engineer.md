---
name: analytics-engineer
description: "Implements Instagram Insights API integrations, analytics dashboards, metrics calculation, and quota history analysis."
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---

# Analytics Engineer Agent

## Architecture Overview

Analytics spans Instagram Insights API integration, quota tracking, and dashboard components.

### Key Files

| File | Purpose |
|------|---------|
| `lib/instagram/insights.ts` | Instagram Insights API client |
| `lib/instagram/quota.ts` | Content publishing quota checking |
| `lib/scheduler/quota-history.ts` | Quota snapshot recording |
| `app/[locale]/analytics/page.tsx` | Analytics page |
| `app/[locale]/insights/page.tsx` | Insights page |
| `app/components/analytics-v2/` | Analytics dashboard components |
| `app/components/insights/` | Insights display components |
| `app/api/content/[id]/insights/route.ts` | Per-content insights API |
| `app/api/schedule/insights/[id]/route.ts` | Per-schedule insights API |
| `app/api/instagram/recent-stories/route.ts` | Recent stories with metrics |

---

## Instagram Insights API

### Supported Metrics by Post Type

| Post Type | Metrics |
|-----------|---------|
| **STORY** | `impressions`, `reach`, `replies`, `taps_forward`, `taps_back`, `exits` |
| **FEED** | `engagement`, `impressions`, `reach`, `saved` |
| **REEL** | `engagement`, `impressions`, `reach`, `saved`, `video_views` |

### API Call Pattern

```typescript
const url = `${GRAPH_API_BASE}/${igMediaId}/insights`;
const response = await axios.get(url, {
  params: {
    metric: metrics.join(','),
    access_token: accessToken
  }
});
```

### Important: API Version

Currently using `v21.0` in insights module. The main publishing module uses `v24.0`. Keep these in sync when upgrading.

### Story Insights Availability

Story insights are only available for **24 hours** after the story expires (stories last 24 hours, so insights are available for up to 48 hours after posting). Fetch insights promptly.

---

## Quota History System

### Database Table: `api_quota_history`

Records quota snapshots at the start and end of each cron run:

```typescript
interface QuotaHistoryRecord {
  userId: string;
  igUserId: string;
  quotaTotal: number;      // Usually 25
  quotaUsage: number;      // Current usage
  quotaDuration: number;
  cronRunId: string;       // Correlates start/end snapshots
  snapshotType: string;    // 'pre_run' | 'post_run'
  postsAttempted: number;
  postsSucceeded: number;
  postsFailed: number;
  postsSkippedQuota: number;
  maxPostsConfig: number;
  errorMessage?: string;
}
```

### Analyzing Quota Trends

```sql
SELECT
  DATE(created_at) as day,
  snapshot_type,
  AVG(quota_usage) as avg_usage,
  MAX(quota_usage) as max_usage,
  SUM(posts_succeeded) as total_published,
  SUM(posts_failed) as total_failed
FROM api_quota_history
GROUP BY DATE(created_at), snapshot_type
ORDER BY day DESC;
```

---

## Adding New Metrics

### Step 1: Update Insights Client

Add the new metric to the appropriate post type array in `lib/instagram/insights.ts`:

```typescript
if (postType === 'STORY') {
  metrics = ['impressions', 'reach', 'replies', 'taps_forward', 'taps_back', 'exits', 'new_metric'];
}
```

### Step 2: Update Types

Add the metric to `MediaInsight` type in `lib/types/`.

### Step 3: Update UI Components

Add display for the new metric in `app/components/insights/` or `app/components/analytics-v2/`.

### Step 4: Verify API Support

Check Meta's API documentation to confirm the metric is supported for the target media type and API version.

---

## Common Issues

### "Insights not available"

- Story may have expired (>48 hours since posting)
- Media type may not support the requested metric
- Insufficient permissions (needs `instagram_manage_insights`)

### Rate Limiting on Insights

Insights API calls count toward the same rate limit as publishing. Monitor with quota history.

### Missing Metrics

Some metrics return empty arrays if the story had zero engagement. Handle `data.data` being empty:

```typescript
// Response may return empty data array for zero-engagement stories
const insights = response.data.data || [];
```

---

## Dashboard Development Patterns

### Component Structure

```
app/components/analytics-v2/
  ├── AnalyticsDashboard.tsx    # Main dashboard wrapper
  ├── MetricsCard.tsx           # Individual metric display
  ├── TrendChart.tsx            # Time-series visualization
  └── InsightsSummary.tsx       # Aggregated insights view
```

### Data Fetching

Use Server Components where possible. Only use client components for interactive charts/filters.

```typescript
// Server Component - fetch on server
export default async function AnalyticsPage() {
  const insights = await getRecentInsights();
  return <AnalyticsDashboard data={insights} />;
}
```

### Quota Dashboard

Display quota usage trends from `api_quota_history`:
- Daily usage vs. total quota
- Publishing success/failure rates
- Peak usage hours
- Quota headroom warnings
