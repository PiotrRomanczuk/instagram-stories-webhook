#!/bin/bash

# Simple Production Health Check
# Tests basic functionality without authentication

echo "🔍 Production Health Check"
echo "=========================="
echo ""
echo "Site: https://stories-webhook.vercel.app"
echo ""

# Test 1: Site is accessible
echo "1️⃣ Checking if site is accessible..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://stories-webhook.vercel.app)
if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 307 ]; then
    echo "   ✅ Site is up (HTTP $STATUS)"
else
    echo "   ❌ Site returned HTTP $STATUS"
fi
echo ""

# Test 2: Login page loads
echo "2️⃣ Checking if login page loads..."
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://stories-webhook.vercel.app/auth/signin)
if [ "$LOGIN_STATUS" -eq 200 ]; then
    echo "   ✅ Login page loads (HTTP $LOGIN_STATUS)"
else
    echo "   ❌ Login page returned HTTP $LOGIN_STATUS"
fi
echo ""

# Test 3: API health (if public)
echo "3️⃣ Checking API health..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://stories-webhook.vercel.app/api/health)
if [ "$API_STATUS" -eq 200 ] || [ "$API_STATUS" -eq 404 ]; then
    echo "   ✅ API responsive (HTTP $API_STATUS)"
else
    echo "   ⚠️ API returned HTTP $API_STATUS"
fi
echo ""

# Test 4: Check deployment info
echo "4️⃣ Checking deployment info..."
echo "   Latest deployment:"
npx vercel ls --prod 2>&1 | head -6 | tail -1
echo ""

# Test 5: Response time
echo "5️⃣ Measuring response time..."
TIME=$(curl -s -o /dev/null -w "%{time_total}" https://stories-webhook.vercel.app)
echo "   ⏱️ Response time: ${TIME}s"
echo ""

echo "=========================="
echo "✅ Basic production checks complete!"
echo ""
echo "📝 Manual verification needed:"
echo "   1. Open https://stories-webhook.vercel.app in browser"
echo "   2. Sign in with Google"
echo "   3. Test video upload manually"
echo "   4. Test Instagram publishing manually"
