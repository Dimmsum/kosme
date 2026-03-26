-- Migration 0004: Employer shortlist
-- Run this in your Supabase SQL Editor AFTER 0003_core_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shortlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employer_id, student_id)
);

ALTER TABLE public.shortlist ENABLE ROW LEVEL SECURITY;

-- Employers can read their own shortlist
CREATE POLICY "shortlist_read_own"
  ON public.shortlist FOR SELECT
  USING (auth.uid() = employer_id);

-- Employers can add to their shortlist
CREATE POLICY "shortlist_insert_own"
  ON public.shortlist FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Employers can remove from their shortlist
CREATE POLICY "shortlist_delete_own"
  ON public.shortlist FOR DELETE
  USING (auth.uid() = employer_id);
