# File Size Enforcer

Scans the codebase for files exceeding the 150-line limit mandated by CLAUDE.md and generates actionable refactoring reports.

## Usage

Invoke when you need to audit file sizes, track technical debt, or before creating a PR to ensure no violations.

## What It Does

1. **Scan**: Finds all `.ts` and `.tsx` files in `app/` and `lib/` exceeding 150 lines
2. **Report**: Generates a prioritized list sorted by severity (lines / 150)
3. **Suggest**: Recommends split strategies based on file type:
   - **Database files**: Split by CRUD (queries, mutations, mappers)
   - **API routes**: Extract validation schemas + business logic into services
   - **Service files**: Extract sub-concerns (retry logic, duplicate detection, etc.)
   - **Components**: Extract sub-components and hooks
4. **Track**: Compares against previous audits to show progress

## Workflow

```bash
# Run the audit
find app/ lib/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | awk '$1 > 150 && !/total$/'
```

### Output Format

```
FILE SIZE AUDIT - <date>
========================

VIOLATIONS (files > 150 lines):
  1. lib/scheduler/process-service.ts    497 lines (3.3x limit)  [SERVICE - split sub-concerns]
  2. app/api/schedule/route.ts           356 lines (2.4x limit)  [API ROUTE - extract to service]
  3. lib/auth.ts                         292 lines (1.9x limit)  [AUTH - split by provider]

SUMMARY:
  Total violations: X files
  Worst offender: Y lines (Z.Zx limit)
  Total excess lines: N

PREVIOUSLY SPLIT (resolved):
  - lib/content-db.ts (926 -> 13 lines barrel)
  - lib/memes-db.ts (859 -> 21 lines barrel)
```

## Split Strategy Reference

| File Pattern | Strategy | Example |
|-------------|----------|---------|
| `lib/*-db.ts` or `lib/database/*.ts` | CRUD split | `queries.ts`, `mutations.ts`, `mappers.ts` + barrel |
| `app/api/*/route.ts` | Extract logic | Validation -> `lib/validations/`, Logic -> `lib/services/` |
| `lib/scheduler/*.ts` | Sub-concern split | Each concern in its own file, orchestrator stays |
| `app/components/*.tsx` | Component split | Sub-components + hooks extraction |
| `lib/utils/*.ts` | Domain split | Group by domain, one utility per file |

## Integration

After splitting, always create a barrel re-export file for backward compatibility:

```typescript
// Original file becomes barrel
export { fn1, fn2 } from './sub-module-a';
export { fn3, fn4 } from './sub-module-b';
```
