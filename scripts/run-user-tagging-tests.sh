#!/bin/bash

# Run Instagram User Tagging E2E Tests
# These tests ACTUALLY PUBLISH to Instagram with user tags
# Uses REAL Instagram account (@www_hehe_pl)

echo "================================================"
echo "Instagram User Tagging E2E Tests - LIVE"
echo "================================================"
echo ""
echo "⚠️  WARNING: These tests will ACTUALLY PUBLISH to Instagram!"
echo "   Account: @www_hehe_pl (p.romanczuk@gmail.com)"
echo "   Test User: @konstanty03"
echo ""
echo "Environment:"
echo "  ENABLE_REAL_IG_TESTS=true"
echo "  ENABLE_LIVE_IG_PUBLISH=true"
echo ""
echo "================================================"
echo ""

# Set environment variables for LIVE publishing
export ENABLE_REAL_IG_TESTS=true
export ENABLE_LIVE_IG_PUBLISH=true

# Run ONLY the user tagging tests
npx playwright test instagram-publishing-live.spec.ts -g "User Tagging"
