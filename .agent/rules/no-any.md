---
description: Enforce strict typing by forbidding the use of the "any" type in TypeScript files.
---

# No "any" Types Allowed

To ensure type safety and maintainable code, the use of the `any` type is strictly forbidden in this project.

## Guidelines

- **Use Specific Types**: Always define interfaces or types for objects, parameters, and return values.
- **Use `unknown`**: If you truly don't know the type yet, use `unknown` instead of `any`, necessitating a type check before use.
- **Generic Types**: Use generics when a function or class should work with multiple types but still maintain type safety.
- **External Libraries**: If an external library uses `any`, try to provide a type assertion or a wrapper with proper types.

## How to Fix Existing "any"
1. Identify the actual structure of the data.
2. Define an `interface` or `type` for it.
3. Replace `: any` with the new type.
4. For catch blocks, use `(error: unknown)` and then check `if (error instanceof Error)`.
