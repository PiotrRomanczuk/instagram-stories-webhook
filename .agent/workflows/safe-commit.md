---
description: Run strict checks (lint + types) before committing.
---

This workflow enforces code quality standards before allowing a commit.

1. Run ESLint.
   ```bash
   npm run lint
   ```
   If this fails, STOP and fix the errors.

2. Run TypeScript Type Check.
   ```bash
   npx tsc --noEmit
   ```
   If this fails, STOP and fix the errors.

3. If both pass, you may proceed with `git commit`.
   ASK the user for the commit message if not provided.
