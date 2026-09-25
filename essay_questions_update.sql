-- Scholar's Sanctuary: Essay Question Support
-- Run this SQL in your Supabase SQL Editor to enable self-graded essay questions.
--
-- OPTIONAL / SAFE TO SKIP: the frontend probes for this column at startup.
-- If it is missing, essay progress is mirrored to the browser's LocalStorage instead and
-- progress saving for every other question type keeps working untouched.

-- 1. Add the self-assessment column to user_progress.
--    Shape mirrors the other JSONB columns: { "0": { "revealed": true, "correct": false }, ... }
--    keyed by the question's index inside the quiz's questions array.
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS essay_responses JSONB DEFAULT '{}'::jsonb;

-- 2. Allow an empty object to be written when a student has not reached any essay question.
ALTER TABLE public.user_progress
ALTER COLUMN essay_responses SET DEFAULT '{}'::jsonb;

-- 3. Backfill existing rows so pre-essay progress records are never null.
UPDATE public.user_progress
SET essay_responses = '{}'::jsonb
WHERE essay_responses IS NULL;

-- 4. Confirm the column is in place.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_progress'
  AND column_name = 'essay_responses';

-- ---------------------------------------------------------------------------
-- NO SCHEMA CHANGE NEEDED FOR THE QUESTIONS THEMSELESS
-- ---------------------------------------------------------------------------
-- Essay questions live entirely inside the existing `quizzes.questions` JSONB column.
-- They are distinguished from multiple-choice questions by a "type": "essay" tag
-- alongside a concealed "answerText", with an empty "options" array:
--
-- {
--   "question": "Explain the difference between a mutex and a semaphore.",
--   "type": "essay",
--   "answerText": "A mutex grants ownership to exactly one thread...",
--   "explanation": "Key point: mutual exclusion vs. a counting resource.",
--   "options": [],
--   "imageUrl": ""
-- }
-- ---------------------------------------------------------------------------
