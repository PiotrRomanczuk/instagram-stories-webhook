---
description: Run strict checks (lint + types) before committing.
---

This workflow enforces code quality standards before allowing a commit.

1. Run ESLint.
   ```bash
   npm run lint
   ```
   If this fails, STOP and fix the errors.

3. Run Unit Tests (Vitest).
   ```bash
   npm run test
   ```
   If this fails, STOP and fix the errors.

4. If all checks pass, you may proceed with `git commit`.
   ASK the user for the commit message if not provided.
