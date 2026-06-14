# Supabase Database Schema

To enable the database backend for the new **Question Reporting** and **Global Updates Inbox** features, run the following SQL commands in your Supabase project's **SQL Editor**.

---

## 1. Reported Questions Table

This table stores questions flagged by users for review.

```sql
-- Create the reported_questions table
CREATE TABLE public.reported_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    quiz_title TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reported_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow any client/user to submit a report (Insert)
CREATE POLICY "Allow anonymous/user inserts" 
ON public.reported_questions 
FOR INSERT 
WITH CHECK (true);

-- Policy: Allow all clients/users to read reports (Select)
-- Note: The frontend fetches reports on initial load. You can limit this in RLS or adjust the UI.
CREATE POLICY "Allow public read access" 
ON public.reported_questions 
FOR SELECT 
USING (true);

-- Policy: Only admin (auth.email() = 'ahmedfalahoffical@gmail.com') can update status to 'resolved'
CREATE POLICY "Allow admin updates" 
ON public.reported_questions 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

-- Index for faster query ordering by created_at
CREATE INDEX idx_reported_questions_created_at ON public.reported_questions (created_at DESC);
```

---

## 2. Global Updates Inbox Table

This table stores system announcements and updates broadcasted by the admin.

```sql
-- Create the inbox_messages table
CREATE TABLE public.inbox_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read updates (Select)
CREATE POLICY "Allow public read access" 
ON public.inbox_messages 
FOR SELECT 
USING (true);

-- Policy: Only admin (auth.email() = 'ahmedfalahoffical@gmail.com') can insert new messages
CREATE POLICY "Allow admin inserts" 
ON public.inbox_messages 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

-- Policy: Only admin (auth.email() = 'ahmedfalahoffical@gmail.com') can update or delete messages
CREATE POLICY "Allow admin updates and deletes" 
ON public.inbox_messages 
FOR ALL 
USING (auth.jwt() ->> 'email' = 'ahmedfalahoffical@gmail.com');

-- Index for faster query ordering by created_at
CREATE INDEX idx_inbox_messages_created_at ON public.inbox_messages (created_at DESC);
```

---

## How to Apply

1. Go to your **Supabase Dashboard**.
2. Select your project and navigate to the **SQL Editor** tab from the left sidebar.
3. Click **New query** and paste the SQL code block above.
4. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
5. Verify that both tables are successfully created in the **Database** table viewer.
