-- Admin Audit Log: append-only record of all admin actions
-- Separate from system_logs (operational chatter) so that admin actions are
-- queryable, filterable, and clearly attributable to a specific actor.

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),

    -- Who performed the action
    actor_user_id text NOT NULL,
    actor_email text NOT NULL,

    -- What action was taken
    -- Convention: '<resource>.<verb>'
    -- Examples: user.add, user.remove, user.role_change,
    --           content.approve, content.reject, content.delete,
    --           content.force_publish, settings.publishing_toggle
    action text NOT NULL,

    -- What was acted upon
    target_type text,           -- 'user', 'content_item', 'meme_submission', 'setting'
    target_id text,             -- UUID or email depending on target_type
    target_email text,          -- Populated for user-targeted actions

    -- State change (for role changes, status transitions, etc.)
    old_value jsonb,
    new_value jsonb,

    -- Request context
    ip_address text,
    user_agent text
);

-- Indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor        ON admin_audit_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action       ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_type  ON admin_audit_log (target_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id    ON admin_audit_log (target_id);

-- RLS: service_role writes; admins/developers can read via supabaseAdmin server-side.
-- No direct client access to this table.
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
