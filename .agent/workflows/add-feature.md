---
description: End-to-end feature development lifecycle from ToDo to completion.
---

# Add Feature Workflow

This workflow guides the complete lifecycle of adding a new feature, from selecting a task to marking it complete.

## 1. Select Feature from ToDo
1. Read `ToDo.md` in the project root.
2. Identify an unchecked `[ ]` item to implement.
3. Confirm the feature scope with the user.

## 2. Create or Review Feature Plan
1. Check if a plan exists: `docs/FEATURE_<NAME>_PLAN.md`.
2. If not, create one with:
   - **Objective**: What the feature accomplishes.
   - **Technical Approach**: How it will be implemented.
   - **Phases**: Breakdown of implementation steps.
   - **API Changes**: Any new endpoints or modifications.
   - **Database Changes**: Schema updates (if any).

## 3. Follow Implementation Process
Execute the `/implementation-process` workflow:
1. **Deep Dive Analysis**: Understand requirements and constraints.
2. **Planning**: Outline architecture and flow using `<PLANNING>` tags.
3. **Implementation**: Write code adhering to all project rules.
4. **Review & Optimize**: Audit for performance, edge cases, and clean code.
5. **Finalization**: Ensure security, tests, and documentation.

## 4. Update ToDo
1. Mark the feature as complete in `ToDo.md`: `[x]`.
2. If the feature introduced new sub-tasks, add them as well.

## 5. Update Documentation
1. If the feature is user-facing, update `README.md`.
2. If new troubleshooting scenarios exist, update `docs/TROUBLESHOOTING.md`.
