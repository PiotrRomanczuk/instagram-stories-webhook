---
description: Enforces Single Responsibility Principle (SRP) and file/component granularity to ensure maintainability and testability.
---

# Single Responsibility & Code Granularity

## 🎯 Single Responsibility Principle (SRP)
- Each file, function, or component must have **exactly one reason to change**.
- If a component handles both data fetching and complex UI rendering, split it into a **Container/Logic** component and a **Presentational** component.
- Extract complex logic into dedicated utility functions or custom hooks (`useHookName.ts`).
- Avoid "God Files" that contain multiple unrelated exports.

## 📏 File & Component Size
- **Keep files small**: Aim for under 150 lines of code. If a file exceeds 200 lines, it is a strong candidate for refactoring.
- **Component Granularity**: 
  - Break down large components into smaller, reusable sub-components.
  - If a piece of JSX within a component is more than 20-30 lines, extract it into a local sub-component or a separate file.
- **Max Function Length**: Functions should ideally be visible on a single screen (20-30 lines). Extract sub-steps into helper functions.

## 🛠️ Refactoring Triggers
- **Cyclomatic Complexity**: If a function has too many nested `if/else` or `switch` statements, flatten it or break it apart.
- **Prop Drilling**: If you are passing props through 3+ layers just to reach a child, consider using a Context, State Management (Zustand), or reconsidering the component hierarchy.
- **Frequent Changes**: If multiple developers are frequently conflicting on the same large file, it needs to be split.

## 📂 Structure Example
Instead of `BigComponent.tsx` (300 lines):
- `components/feature/FeatureWrapper.tsx` (Logic/State)
- `components/feature/FeatureHeader.tsx` (UI)
- `components/feature/FeatureList.tsx` (UI)
- `hooks/useFeatureLogic.ts` (State/API)
