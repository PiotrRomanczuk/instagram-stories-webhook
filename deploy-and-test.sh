#!/bin/bash

# Deploy and Test Production
# This script deploys to production and then runs smoke tests

set -e  # Exit on error

echo "🚀 Deploy and Test Production Workflow"
echo "=========================================="
echo ""

# Step 1: Check current status
echo "📊 Step 1: Checking current status..."
echo ""
echo "Latest Local Commit:"
git log -1 --oneline
echo ""
echo "Current Production Deployment:"
npx vercel ls --prod | head -5
echo ""

# Step 2: Confirm deployment
read -p "Deploy latest changes to production? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Step 3: Run pre-deployment checks
echo ""
echo "✅ Step 2: Running pre-deployment checks..."
echo ""

echo "Running linter..."
npm run lint || { echo "❌ Linting failed"; exit 1; }

echo "Running TypeScript check..."
npx tsc --noEmit || { echo "❌ TypeScript check failed"; exit 1; }

echo "Running unit tests..."
npm run test || { echo "❌ Unit tests failed"; exit 1; }

echo "✅ Pre-deployment checks passed!"
echo ""

# Step 4: Deploy to production
echo "🚀 Step 3: Deploying to production..."
echo ""
npx vercel --prod

echo ""
echo "✅ Deployment initiated!"
echo ""

# Step 5: Wait for deployment
echo "⏳ Step 4: Waiting 30 seconds for deployment to complete..."
sleep 30
echo ""

# Step 6: Verify deployment
echo "🔍 Step 5: Verifying deployment..."
npx vercel ls --prod | head -5
echo ""

# Step 7: Confirm testing
read -p "Run production smoke tests now? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "ℹ️ Smoke tests skipped. Run manually with:"
    echo "   BASE_URL=https://marszal-arts.vercel.app npm run test:e2e:production:smoke"
    exit 0
fi

# Step 8: Run production smoke tests
echo ""
echo "🧪 Step 6: Running production smoke tests..."
echo ""

BASE_URL=https://marszal-arts.vercel.app \
ENABLE_REAL_IG_TESTS=true \
ENABLE_LIVE_IG_PUBLISH=true \
  npm run test:e2e:production:smoke

echo ""
echo "✅ Production deployment and testing complete!"
echo ""
echo "📊 Summary:"
echo "  - Deployed: ✅"
echo "  - Tests: ✅"
echo "  - Production URL: https://marszal-arts.vercel.app"
