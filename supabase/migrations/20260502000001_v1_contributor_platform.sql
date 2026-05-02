-- v1 contributor platform — schema additions
--
-- Extends email_whitelist with onboarding + PII fields, adds the tag
-- taxonomy + submission tags, payout ledger, scheduler mode/pinning,
-- storage_uri columns, user_preferences cadence config. Seeds the
-- 26-slug starter taxonomy.
--
-- Idempotent: uses IF NOT EXISTS / DO blocks. Safe to re-run.

-- ============================================================
-- 1. Roles + onboarding + PII on email_whitelist
-- ============================================================

ALTER TABLE public.email_whitelist
    ADD COLUMN IF NOT EXISTS display_name text,
    ADD COLUMN IF NOT EXISTS display_name_override text,
    ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS license_version text,
    ADD COLUMN IF NOT EXISTS license_accepted_at timestamptz,
    ADD COLUMN IF NOT EXISTS legal_name text,
    ADD COLUMN IF NOT EXISTS pesel_encrypted bytea,
    ADD COLUMN IF NOT EXISTS address_encrypted bytea,
    ADD COLUMN IF NOT EXISTS iban_encrypted bytea,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS address_city text,
    ADD COLUMN IF NOT EXISTS has_other_employment_above_min_wage boolean,
    ADD COLUMN IF NOT EXISTS is_student_under_26 boolean,
    ADD COLUMN IF NOT EXISTS tax_residency text DEFAULT 'PL',
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
    ADD COLUMN IF NOT EXISTS pii_purged_at timestamptz;

-- Allow new role values. Drop old check constraint if it exists, replace.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public'
          AND table_name = 'email_whitelist'
          AND constraint_name = 'email_whitelist_role_check'
    ) THEN
        ALTER TABLE public.email_whitelist DROP CONSTRAINT email_whitelist_role_check;
    END IF;
END $$;

ALTER TABLE public.email_whitelist
    ADD CONSTRAINT email_whitelist_role_check
    CHECK (role IN ('developer', 'admin', 'curator', 'contributor', 'user', 'demo'));

-- ============================================================
-- 2. Tag taxonomy
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tag_categories (
    slug text PRIMARY KEY,
    label text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('holiday', 'theme', 'event', 'content_type')),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submission_categories (
    submission_id uuid NOT NULL REFERENCES public.meme_submissions(id) ON DELETE CASCADE,
    category_slug text NOT NULL REFERENCES public.tag_categories(slug),
    source text NOT NULL CHECK (source IN ('ai', 'contributor', 'curator')),
    confidence numeric,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (submission_id, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_submission_categories_category
    ON public.submission_categories(category_slug);

CREATE TABLE IF NOT EXISTS public.submission_keywords (
    submission_id uuid NOT NULL REFERENCES public.meme_submissions(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    PRIMARY KEY (submission_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_submission_keywords_keyword
    ON public.submission_keywords(keyword);

-- ============================================================
-- 3. Storage URI columns + audio reference
-- ============================================================

ALTER TABLE public.meme_submissions
    ADD COLUMN IF NOT EXISTS storage_uri text;

DO $$
BEGIN
    IF to_regclass('public.story_archive') IS NOT NULL THEN
        ALTER TABLE public.story_archive ADD COLUMN IF NOT EXISTS storage_uri text;
    END IF;
    IF to_regclass('public.composed_videos') IS NOT NULL THEN
        ALTER TABLE public.composed_videos ADD COLUMN IF NOT EXISTS storage_uri text;
        ALTER TABLE public.composed_videos ADD COLUMN IF NOT EXISTS audio_track_id uuid;
    END IF;
END $$;

-- ============================================================
-- 4. Scheduler mode + pinning
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.scheduled_posts') IS NOT NULL THEN
        ALTER TABLE public.scheduled_posts
            ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'auto'
                CHECK (schedule_mode IN ('auto', 'pinned')),
            ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
    END IF;
END $$;

-- ============================================================
-- 5. Payout ledger
-- ============================================================

ALTER TABLE public.meme_submissions
    ADD COLUMN IF NOT EXISTS payout_amount_zl numeric,
    ADD COLUMN IF NOT EXISTS payout_bonus_zl numeric,
    ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending'
        CHECK (payout_status IN ('pending', 'invoiced', 'paid', 'voided')),
    ADD COLUMN IF NOT EXISTS payout_period text;

CREATE INDEX IF NOT EXISTS idx_meme_submissions_payout_period
    ON public.meme_submissions(payout_period);

CREATE TABLE IF NOT EXISTS public.payout_periods (
    period text NOT NULL,
    contributor_email text NOT NULL,
    total_zl numeric NOT NULL,
    post_count integer NOT NULL,
    invoice_number text,
    paid_at timestamptz,
    transfer_reference text,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (period, contributor_email)
);

-- ============================================================
-- 6. Cadence config + per-post rate on user_preferences
-- ============================================================

DO $$
BEGIN
    IF to_regclass('public.user_preferences') IS NOT NULL THEN
        ALTER TABLE public.user_preferences
            ADD COLUMN IF NOT EXISTS daily_target integer DEFAULT 85,
            ADD COLUMN IF NOT EXISTS active_window_start time DEFAULT '08:00',
            ADD COLUMN IF NOT EXISTS active_window_end time DEFAULT '00:00',
            ADD COLUMN IF NOT EXISTS min_gap_minutes integer DEFAULT 6,
            ADD COLUMN IF NOT EXISTS max_gap_minutes integer DEFAULT 25,
            ADD COLUMN IF NOT EXISTS default_payout_rate_zl numeric;
    END IF;
END $$;

-- ============================================================
-- 7. Seed the 26 starter taxonomy slugs
-- ============================================================

INSERT INTO public.tag_categories (slug, label, kind) VALUES
    ('new-year',         'New Year',                  'holiday'),
    ('valentines',       'Valentine''s Day',          'holiday'),
    ('womens-day',       'Women''s Day (Mar 8)',      'holiday'),
    ('easter',           'Easter',                    'holiday'),
    ('labour-day',       'Labour Day (May 1)',        'holiday'),
    ('constitution-day', 'Constitution Day (May 3)',  'holiday'),
    ('childrens-day',    'Children''s Day (Jun 1)',   'holiday'),
    ('assumption',       'Assumption (Aug 15)',       'holiday'),
    ('all-saints',       'All Saints (Nov 1)',        'holiday'),
    ('independence-day', 'Independence Day (Nov 11)', 'holiday'),
    ('st-nicholas',      'St. Nicholas (Dec 6)',      'holiday'),
    ('christmas-eve',    'Christmas Eve',             'holiday'),
    ('christmas',        'Christmas',                 'holiday'),
    ('sylwester',        'Sylwester',                 'holiday'),
    ('summer',           'Summer',                    'theme'),
    ('winter',           'Winter',                    'theme'),
    ('autumn',           'Autumn',                    'theme'),
    ('spring',           'Spring',                    'theme'),
    ('weekend-vibes',    'Weekend Vibes',             'theme'),
    ('monday-mood',      'Monday Mood',               'theme'),
    ('friday-feeling',   'Friday Feeling',            'theme'),
    ('vernissage',       'Vernissage',                'event'),
    ('exhibition',       'Exhibition',                'event'),
    ('marszal-meetup',   'Marszal Meetup',            'event'),
    ('meme',             'Meme',                      'content_type'),
    ('bts',              'Behind the Scenes',         'content_type'),
    ('art',              'Art',                       'content_type'),
    ('reel-clip',        'Reel Clip',                 'content_type'),
    ('announcement',     'Announcement',              'content_type'),
    ('throwback',        'Throwback',                 'content_type')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 8. Permissions
-- ============================================================

GRANT ALL ON public.tag_categories TO service_role;
GRANT SELECT ON public.tag_categories TO authenticated;

GRANT ALL ON public.submission_categories TO service_role;
GRANT SELECT, INSERT, DELETE ON public.submission_categories TO authenticated;

GRANT ALL ON public.submission_keywords TO service_role;
GRANT SELECT, INSERT, DELETE ON public.submission_keywords TO authenticated;

GRANT ALL ON public.payout_periods TO service_role;

NOTIFY pgrst, 'reload schema';
