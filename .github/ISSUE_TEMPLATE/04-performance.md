---
name: Performance Issue
about: Report a performance problem or optimization opportunity
title: "[PERF] "
labels: performance
assignees: ''

---

## Performance Issue
<!-- What is slow? What's the impact? -->

## Current Performance
- **Endpoint/Component**:
- **Current Response Time**:
- **Expected Response Time**:
- **Impact**: High / Medium / Low

## Reproduction Steps
1.
2.
3.

## Measurements
<!-- Include performance metrics -->
- Browser: (Chrome DevTools, Network tab)
- Backend: (response headers, logs)
- Database: (query execution time)

## Root Cause Analysis (if known)
<!-- Frontend rendering? Database query? API latency? -->

## Proposed Solution
<!-- How should we optimize? -->

## Optimization Checklist
- [ ] Database query profiled (EXPLAIN ANALYZE used)
- [ ] Frontend rendering analyzed (React DevTools Profiler)
- [ ] No N+1 queries detected
- [ ] Caching strategy evaluated
- [ ] Dependency bundle size checked

## Related Documentation
- See [CLAUDE.md - Performance Profiling](../CLAUDE.md#performance-profiling)
- See [CLAUDE.md - Frontend Architecture](../CLAUDE.md#frontend-architecture)
- See [WORKFLOWS.md - Optimize Slow API Endpoint](../WORKFLOWS.md#workflow-optimize-slow-api-endpoint)

## Performance Testing Plan
- [ ] Performance improved (measure before/after)
- [ ] No regressions in other areas
- [ ] Changes verified on staging

## Related Issues
<!-- Link to related performance issues or monitoring alerts -->
