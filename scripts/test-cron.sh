#!/bin/bash

# Test Vercel Cron Jobs
# Usage: ./scripts/test-cron.sh [job-name] [environment]
# Example: ./scripts/test-cron.sh process local
# Example: ./scripts/test-cron.sh process-videos production

set -e

JOB=${1:-process}
ENV=${2:-local}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Testing Vercel Cron Job"
echo "=========================="
echo ""

# Set base URL
if [ "$ENV" = "production" ]; then
  BASE_URL="https://stories-webhook.vercel.app"
  echo "Environment: ${YELLOW}PRODUCTION${NC}"
else
  BASE_URL="http://localhost:3000"
  echo "Environment: ${GREEN}LOCAL${NC}"
fi

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
  echo "${RED}ERROR: CRON_SECRET not set${NC}"
  echo ""
  echo "Set it with:"
  echo "  export CRON_SECRET=your-secret-here"
  echo ""
  echo "Or load from .env.local:"
  echo "  source .env.local"
  exit 1
fi

echo "Job: ${GREEN}$JOB${NC}"
echo "URL: $BASE_URL/api/cron/$JOB"
echo ""

# Make request
echo "Sending request..."
echo ""

RESPONSE=$(curl -X GET "$BASE_URL/api/cron/$JOB" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" \
  -s)

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
# Extract body (everything except last line)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check HTTP status
if [ "$HTTP_CODE" = "200" ]; then
  echo "${GREEN}✅ SUCCESS (HTTP $HTTP_CODE)${NC}"
  exit 0
elif [ "$HTTP_CODE" = "401" ]; then
  echo "${RED}❌ UNAUTHORIZED (HTTP $HTTP_CODE)${NC}"
  echo ""
  echo "Check your CRON_SECRET"
  exit 1
else
  echo "${RED}❌ FAILED (HTTP $HTTP_CODE)${NC}"
  exit 1
fi
