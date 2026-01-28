---
description: Clean up orphaned files in Supabase storage using the cron endpoint.
---

# Orphaned Storage Cleanup Workflow

This workflow describes how to manually trigger or verify the automated cleanup of orphaned files in storage.

### 1. Manual Cleanup Trigger
If you suspect there are many orphaned files that haven't been cleaned up by the hourly cron yet, you can trigger it manually:

// turbo
```bash
curl -X GET http://localhost:3000/api/cron/cleanup-orphans -H "Authorization: Bearer ${CRON_SECRET}"
```

*(Note: Replace `http://localhost:3000` with your production URL and ensure `CRON_SECRET` matches your environment variable.)*

### 2. Verify Cleanup Status
You can check the logs to see the results of the cleanup operation:

1. Open Vercel Logs or your local terminal.
2. Search for the `storage:cleanup` module tag.
3. Look for "Deleted X orphaned files" messages.

### 3. How it Works
1. Files are uploaded to the `stories` bucket.
2. A record is created in the `pending_uploads` table.
3. Once the meme is successfully submitted, the record is removed from `pending_uploads`.
4. The cleanup job finds all records in `pending_uploads` older than 1 hour.
5. It verifies they are NOT linked to any existing `meme_submissions`.
6. It deletes the file from Supabase Storage and removes the tracking record.
