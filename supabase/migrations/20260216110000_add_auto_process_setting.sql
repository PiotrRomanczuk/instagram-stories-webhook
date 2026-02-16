-- Add auto_process_videos setting to system_settings
-- When 'true', uploaded videos are automatically processed to meet
-- Instagram Stories requirements (resolution, codec, frame rate).

INSERT INTO system_settings (key, value, description)
VALUES (
  'auto_process_videos',
  'true',
  'Automatically process uploaded videos to meet Instagram Stories requirements'
)
ON CONFLICT (key) DO NOTHING;
