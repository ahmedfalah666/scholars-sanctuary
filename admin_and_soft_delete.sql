-- Scholar's Sanctuary: multi-admin + soft delete
-- Run in the Supabase SQL Editor, in this order, as the admin/owner role.
-- Every statement is safe to re-run.
--
-- Purpose:
--   1. Admin access becomes a table. Adding an account is one INSERT, with no code
--      change and no redeploy. Previously the email was hardcoded in ~15 RLS policies
--      and in App.jsx, so every new admin meant editing code and hand-editing SQL.
--   2. Deletes become soft. A deleted folder or assessment is marked with deleted_at
--      instead of being physically removed, so no foreign key cascade can fire and a
--      restore returns the original row untouched.
--
-- Verify with the checks at the bottom.

-- ============================================================================
-- 1. ADMIN ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    email TEXT PRIMARY KEY,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    note TEXT
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Single source of truth. Read by is_admin() below.
-- This function is SECURITY DEFINER, so it is not subject to the RLS enabled above,
-- which is what stops the policy check from recursing into this table.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE lower(email) = lower(auth.jwt() ->> 'email')
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Seed the existing admin. Replace the address if your account differs.
INSERT INTO public.admin_users (email, note)
VALUES ('ahmedfalahoffical@gmail.com', 'founder')
ON CONFLICT (email) DO NOTHING;

-- A signed-in user may read exactly one row: their own. This is how the app asks
-- "am I an admin?" without ever seeing the rest of the list.
DROP POLICY IF EXISTS "Users may read their own admin row" ON public.admin_users;
CREATE POLICY "Users may read their own admin row"
ON public.admin_users
FOR SELECT
USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- ============================================================================
-- 2. SOFT DELETE COLUMNS
-- ============================================================================

ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE public.quizzes
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Every read filters on deleted_at, so index it.
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON public.groups (deleted_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_deleted_at ON public.quizzes (deleted_at);

-- ============================================================================
-- 3. MIGRATE EXISTING TRASH BUNDLES
-- ============================================================================
-- The previous design copied deleted rows into trash_items as JSON and then removed
-- the originals. This re-inserts anything still sitting in the bin and marks it
-- deleted, so it shows up in the new Trash view and restores losslessly.
-- Skipped automatically if trash_items does not exist.

DO $$
BEGIN
    IF to_regclass('public.trash_items') IS NULL THEN
        RAISE NOTICE 'trash_items not present, nothing to migrate.';
        RETURN;
    END IF;

    -- Assessments captured in the bin.
    INSERT INTO public.quizzes (id, quiz_title, questions, group_id, deleted_at)
    SELECT q->>'id',
           COALESCE(q->>'quiz_title', 'Untitled Assessment'),
           COALESCE(q->'questions', '[]'::jsonb),
           NULLIF(q->>'group_id', '')::bigint,
           timezone('utc'::text, now())
    FROM public.trash_items t,
         LATERAL jsonb_array_elements(COALESCE(t.payload->'quizzes', '[]'::jsonb)) AS q
    WHERE t.kind = 'quiz'
      AND NOT EXISTS (SELECT 1 FROM public.quizzes e WHERE e.id = (q->>'id')::bigint)
    ON CONFLICT DO NOTHING;

    -- Folders captured in the bin, parents first so the self-reference holds.
    INSERT INTO public.groups (id, name, parent_id, deleted_at)
    SELECT f->>'id',
           COALESCE(f->>'name', 'Restored folder'),
           NULLIF(f->>'parent_id', '')::bigint,
           timezone('utc'::text, now())
    FROM public.trash_items t,
         LATERAL jsonb_array_elements(COALESCE(t.payload->'folders', '[]'::jsonb)) AS f
    WHERE t.kind = 'folder'
      AND NOT EXISTS (SELECT 1 FROM public.groups e WHERE e.id = (f->>'id')::bigint)
    ON CONFLICT DO NOTHING;

    -- Assessments that belonged to a restored folder, linked back to it.
    UPDATE public.quizzes q
    SET group_id = g.id
    FROM public.trash_items t,
         LATERAL jsonb_array_elements(COALESCE(t.payload->'quizzes', '[]'::jsonb)) AS jq
    JOIN public.groups g ON g.id = NULLIF(jq->>'group_id', '')::bigint
    WHERE t.kind = 'folder'
      AND q.id = NULLIF(jq->>'id', '')::bigint
      AND q.group_id IS NULL
      AND q.deleted_at IS NOT NULL;

    RAISE NOTICE 'trash bundles migrated into soft-deleted rows.';
END $$;

-- ============================================================================
-- 4. POLICIES
-- ============================================================================
-- All admin checks now call is_admin(). Rerun after adding anyone to admin_users.

-- groups: read for everyone, writes for admins.
DROP POLICY IF EXISTS "Allow public read access" ON public.groups;
DROP POLICY IF EXISTS "Allow admin read access for groups" ON public.groups;
DROP POLICY IF EXISTS "Allow admin inserts for groups" ON public.groups;
DROP POLICY IF EXISTS "Allow admin updates for groups" ON public.groups;
DROP POLICY IF EXISTS "Allow admin deletes for groups" ON public.groups;

CREATE POLICY "Allow public read access" ON public.groups
    FOR SELECT USING (true);
CREATE POLICY "Allow admin inserts for groups" ON public.groups
    FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin updates for groups" ON public.groups
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin deletes for groups" ON public.groups
    FOR DELETE USING (public.is_admin());

-- quizzes: same shape.
DROP POLICY IF EXISTS "Allow public read access" ON public.quizzes;
DROP POLICY IF EXISTS "Allow admin read access for quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow admin inserts for quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow admin updates for quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow admin deletes for quizzes" ON public.quizzes;

CREATE POLICY "Allow public read access" ON public.quizzes
    FOR SELECT USING (true);
CREATE POLICY "Allow admin inserts for quizzes" ON public.quizzes
    FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin updates for quizzes" ON public.quizzes
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin deletes for quizzes" ON public.quizzes
    FOR DELETE USING (public.is_admin());

-- inbox_messages
DROP POLICY IF EXISTS "Allow admin inserts" ON public.inbox_messages;
DROP POLICY IF EXISTS "Allow admin updates and deletes" ON public.inbox_messages;
CREATE POLICY "Allow admin inserts" ON public.inbox_messages
    FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin updates and deletes" ON public.inbox_messages
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- reported_questions
DROP POLICY IF EXISTS "Allow admin updates" ON public.reported_questions;
CREATE POLICY "Allow admin updates" ON public.reported_questions
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Allow admin deletes" ON public.reported_questions;
CREATE POLICY "Allow admin deletes" ON public.reported_questions
    FOR DELETE USING (public.is_admin());

-- site_visits
DROP POLICY IF EXISTS "Allow admin read access for visits" ON public.site_visits;
CREATE POLICY "Allow admin read access for visits" ON public.site_visits
    FOR SELECT USING (public.is_admin());

-- Any remaining policy still comparing against the old hardcoded address.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (qual ILIKE '%ahmedfalah%' OR with_check ILIKE '%ahmedfalah%')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'dropped stale hardcoded policy: %.%', r.tablename, r.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- 5. REMOVE THE CASCADE ADDED WHILE DEBUGGING
-- ============================================================================
-- It let Postgres delete child rows on its own, independent of the app, which is
-- how deleting one folder could empty whole branches. The app now walks the subtree
-- itself and marks rows one by one, so the plain constraint is what we want.
-- If this constraint does not exist the drop is a no-op and the add restores a
-- correct plain foreign key either way.

ALTER TABLE public.groups
    DROP CONSTRAINT IF EXISTS groups_parent_id_fkey;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'groups'
          AND constraint_type = 'FOREIGN KEY'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'groups' AND c.contype = 'f'
    ) THEN
        ALTER TABLE public.groups
            ADD CONSTRAINT groups_parent_id_fkey
            FOREIGN KEY (parent_id) REFERENCES public.groups(id);
        RAISE NOTICE 'plain parent_id foreign key in place';
    END IF;
END $$;

-- ============================================================================
-- 6. RETIRE THE OLD TRASH
-- ============================================================================
-- Left in place, unused, so the migrated bundles stay recoverable. Drop it yourself
-- once you are happy:  DROP TABLE public.trash_items;

-- ============================================================================
-- CHECKS — run these and read the output
-- ============================================================================

-- Should list every admin, and nothing else can see the list.
SELECT email, added_at, note FROM public.admin_users ORDER BY added_at;

-- Should be true for an admin session, false for a student.
SELECT public.is_admin() AS current_session_is_admin;

-- Should be false everywhere: no policy may still name the old address.
SELECT COUNT(*) AS hardcoded_policies_remaining
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual ILIKE '%ahmedfalah%' OR with_check ILIKE '%ahmedfalah%');

-- Should show no CASCADE on the parent foreign key.
SELECT conname, confdeltype
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'groups' AND c.contype = 'f';

-- Live vs trashed counts.
SELECT
    (SELECT count(*) FROM public.groups  WHERE deleted_at IS NULL) AS live_folders,
    (SELECT count(*) FROM public.groups  WHERE deleted_at IS NOT NULL) AS trashed_folders,
    (SELECT count(*) FROM public.quizzes WHERE deleted_at IS NULL) AS live_quizzes,
    (SELECT count(*) FROM public.quizzes WHERE deleted_at IS NOT NULL) AS trashed_quizzes;

-- ADDING AN ADMIN FROM NOW ON: one line, no code change, no redeploy.
-- INSERT INTO public.admin_users (email, note) VALUES ('someone@example.com', 'editor');
