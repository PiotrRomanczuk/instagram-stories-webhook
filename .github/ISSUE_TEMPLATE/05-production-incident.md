---
name: Production Incident
about: Report a critical production issue requiring immediate attention
title: "[INCIDENT] "
labels: incident, critical
assignees: ''

---

## Severity Level
- [ ] **Critical** (Service down, data loss, widespread impact)
- [ ] **High** (Major feature broken, many users affected)
- [ ] **Medium** (Feature partially broken, some users affected)

## Incident Description
<!-- What is broken? How many users affected? -->

## Impact
- **Users Affected**:
- **Business Impact**:
- **Data Loss Risk**: Yes / No

## Timeline
- **Discovery Time**:
- **First Alert**:
- **Investigation Started**:
- **Mitigation Started**:
- **Resolution Time**:

## Symptoms
<!-- What are users experiencing? -->

## Root Cause (if known)
<!-- What caused this? -->

## Immediate Actions Taken
- [ ] Rolled back deployment
- [ ] Disabled feature flag
- [ ] Increased timeouts
- [ ] Other:

## Investigation Steps
1.
2.
3.

## Resolution
<!-- What fixed it? -->

## Monitoring & Alerts
- [ ] Alert configured to catch this issue in future
- [ ] Dashboard updated to track metric

## Follow-up Actions
- [ ] Root cause analysis completed
- [ ] Code review added safeguard
- [ ] Test case added to prevent regression
- [ ] Documentation updated

## Related Workflows
Incident response followed:
- See [WORKFLOWS.md - Handle Critical Production Issue](../WORKFLOWS.md#workflow-handle-critical-production-issue)
- See [WORKFLOWS.md - Investigate High Error Rate](../WORKFLOWS.md#workflow-investigate-high-error-rate)

## Related Documentation
- See [CLAUDE.md - Troubleshooting Decision Tree](../CLAUDE.md#production-troubleshooting-decision-tree)
- See [CLAUDE.md - Monitoring & Alerting Strategy](../CLAUDE.md#monitoring--alerting-strategy)

## Postmortem (complete after incident)
<!-- 5-Why analysis, lessons learned, prevention measures -->

## Related Issues
<!-- Link to any related issues or monitoring alerts -->

---

**Incident Commander**:
**Status**: 🔴 Open / 🟡 Investigating / 🟢 Resolved
