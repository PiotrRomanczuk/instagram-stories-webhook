#!/bin/bash

# Load environment variables
source <(grep -v '^#' .env.local | sed 's/^/export /')

# Apply migration using Supabase Management API
curl -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "query": "CREATE TABLE IF NOT EXISTS user_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, tour_completed BOOLEAN DEFAULT FALSE, tour_version INTEGER DEFAULT 1, last_tour_date TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), UNIQUE(user_id)); ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY; CREATE POLICY IF NOT EXISTS \"Users can view own preferences\" ON user_preferences FOR SELECT USING (auth.uid() = user_id); CREATE POLICY IF NOT EXISTS \"Users can insert own preferences\" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id); CREATE POLICY IF NOT EXISTS \"Users can update own preferences\" ON user_preferences FOR UPDATE USING (auth.uid() = user_id); CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);"
}
EOF
