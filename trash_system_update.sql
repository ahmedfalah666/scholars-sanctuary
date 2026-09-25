-- Scholar's Sanctuary: Trash / Recycle Bin
-- Run this SQL in your Supabase SQL Editor to enable recoverable deletions.
--
-- OPTIONAL / SAFE TO SKIP: the frontend probes for this table at startup.
-- If it is missing, deletions fall back to the old permanent-delete behaviour, so an
-- un-migrated database keeps working (just without an undo).

-- 1. Each row is a self-contained bundle of everything that was removed, so a restore
--    never has to reconstruct state from the live tables.
--    kind      'folder' = a folder plus its whole subtree, 'quiz' = a single assessment
--    payload   { "folders": [...], "quizzes": [...] } with original ids preserved
CREATE TABLE IF NOT EXISTS public.trash_items (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('folder', 'quiz')),
    label TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Row Level Security, matching the pattern used by the other tables in this project.
ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;

-- Students never need to read the trash; the UI is admin-only.
DROP POLICY IF EXISTS "Allow public read access" ON public.trash_items;

-- Only the admin can read the trash, and only the admin can write to it.
CREATE POLICY "Allow admin read access for trash"
ON public.trash_items
FOR SELECT
USING (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

CREATE POLICY "Allow admin inserts for trash"
ON public.trash_items
FOR INSERT
WITH CHECK (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

CREATE POLICY "Allow admin deletes for trash"
ON public.trash_items
FOR DELETE
USING (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

-- 3. Newest first is the order the Trash view renders in.
CREATE INDEX IF NOT EXISTS idx_trash_items_deleted_at ON public.trash_items (deleted_at DESC);

-- ---------------------------------------------------------------------------
-- RLS ON THE RESTORED ROWS
-- ---------------------------------------------------------------------------
-- Restoring re-inserts into `groups` and `quizzes` using the ORIGINAL ids. That requires
-- the admin to hold INSERT rights on those two tables. If your `groups` / `quizzes`
-- policies are restrictive, add the matching admin policies:
--
--   CREATE POLICY "Allow admin inserts for groups"
--   ON public.groups FOR INSERT
--   WITH CHECK (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');
--
--   CREATE POLICY "Allow admin inserts for quizzes"
--   ON public.quizzes FOR INSERT
--   WITH CHECK (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');
--
-- Delete access is already required by the existing delete UI, so it is assumed present.
-- ---------------------------------------------------------------------------
