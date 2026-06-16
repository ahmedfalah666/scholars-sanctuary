-- Scholar's Sanctuary: Analytics Admin Features Update
-- Run this SQL in your Supabase SQL Editor to enable the new Admin Analytics Dashboard tracking.

-- 1. Create the site_visits table to track daily visits
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) on the new table
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy to allow ANYONE to insert a visit
CREATE POLICY "Allow public inserts for visits" 
ON public.site_visits FOR INSERT WITH CHECK (true);

-- 4. Create Policy to allow ONLY the admin to read visits data
-- Replace 'ahmedfalahoffical@gmail.com' if your admin email is different.
CREATE POLICY "Allow admin read access for visits" 
ON public.site_visits FOR SELECT USING (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

-- 5. Create an index on created_at for faster analytics aggregations
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits (created_at DESC);

-- NOTE ON IMAGES:
-- Image URLs in questions do NOT require a schema update. 
-- They are natively supported by the existing JSONB 'questions' column inside your 'quizzes' table.
