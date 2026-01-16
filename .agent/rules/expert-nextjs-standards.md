---
description: Standards for optimized, maintainable Next.js, TypeScript, and modern UI development.
---

# Expert Next.js Development Standards

## Code Style and Structure
- Write concise, technical TypeScript code; avoid classes.
- Use functional and declarative programming patterns.
- Favor iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`).
- File structure: exported components, subcomponents, helpers, static content, and types.
- Directory naming: use lowercase with dashes (e.g., `components/auth-wizard`).

## Optimization & Best Practices
- Minimize the use of `'use client'`, `useEffect`, and `setState`; favor React Server Components (RSC) and Next.js SSR features.
- Implement dynamic imports for code splitting and optimization.
- Use responsive design with a mobile-first approach.
- Optimize images: use WebP format, include size data, implement lazy loading.

## Error Handling & Validation
- Prioritize error handling and edge cases:
  - Use early returns for error conditions.
  - Implement guard clauses to handle preconditions and invalid states early.
  - Use custom error types for consistent error handling.
- Implement validation using Zod for schema validation.

## UI & Styling
- Use modern UI frameworks (Tailwind CSS, Shadcn UI, Radix UI) for styling.
- Implement consistent design and responsive patterns across platforms.

## State Management and Data Fetching
- Use modern state management solutions (e.g., Zustand, TanStack React Query) for global state and data fetching.

## Security & Performance
- Follow performance optimization techniques, such as reducing load times and improving rendering efficiency.
- Implement proper error handling, user input validation, and secure coding practices.

## Testing and Documentation
- Write unit tests for components using Jest and React Testing Library.
- Provide clear and concise comments for complex logic.
- Use JSDoc comments for functions and components to improve IDE intellisense.
