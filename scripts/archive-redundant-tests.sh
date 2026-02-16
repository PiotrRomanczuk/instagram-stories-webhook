#!/bin/bash

# E2E Test Cleanup - Phase 3: Archive Redundant Tests
# This script moves 74 redundant test files to archive/deleted-tests/

set -e

# Change to project root
cd "$(dirname "$0")/.."

# Files to KEEP (6 core files)
KEEP_FILES=(
  "auth-and-rbac-core.spec.ts"
  "developer-tools.spec.ts"
  "critical-user-journeys.spec.ts"
  "mobile-responsive-core.spec.ts"
  "instagram-publishing-live.spec.ts"
  "production-smoke.spec.ts"
)

# Create archive directory
mkdir -p archive/deleted-tests

echo "📦 Archiving redundant E2E test files..."
echo "Keeping 6 core files:"
for file in "${KEEP_FILES[@]}"; do
  echo "  ✅ $file"
done
echo ""

# Move all .spec.ts files except the ones to keep
archived=0
shopt -s nullglob
for file in __tests__/e2e/*.spec.ts; do
  filename=$(basename "$file")

  # Check if this file should be kept
  keep=false
  for keep_file in "${KEEP_FILES[@]}"; do
    if [ "$filename" = "$keep_file" ]; then
      keep=true
      break
    fi
  done

  # Archive if not in keep list
  if [ "$keep" = false ]; then
    echo "📁 Archiving: $filename"
    mv "$file" "archive/deleted-tests/"
    ((archived++))
  fi
done

echo ""
echo "✅ Archived $archived test files"
echo "✅ Remaining: 6 core test files"
echo ""
echo "Files in __tests__/e2e/:"
ls -1 __tests__/e2e/*.spec.ts
