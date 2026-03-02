#!/bin/bash

# Production Testing Quick Script
# Usage: ./run-production-tests.sh

echo "🚀 Running Production Smoke Tests"
echo "📍 Site: https://stories-webhook.vercel.app"
echo ""

BASE_URL=https://stories-webhook.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke
