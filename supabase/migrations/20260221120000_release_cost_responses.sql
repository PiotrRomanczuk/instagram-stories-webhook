-- Release cost approval responses
CREATE TABLE IF NOT EXISTS release_cost_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL,
  user_email text NOT NULL,
  response text NOT NULL CHECK (response IN ('accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (version, user_email)
);

ALTER TABLE release_cost_responses ENABLE ROW LEVEL SECURITY;

-- Admins/developers can read all responses
CREATE POLICY "Admins can read all responses"
  ON release_cost_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_whitelist
      WHERE email = auth.jwt() ->> 'email'
      AND role IN ('admin', 'developer')
    )
  );

-- Seed the default whats_new_config
INSERT INTO system_settings (key, value, description)
VALUES (
  'whats_new_config',
  '{"audienceType":"all","targetEmails":[]}',
  'Controls which users see the What''s New release notes dialog'
)
ON CONFLICT (key) DO NOTHING;
