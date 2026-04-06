-- Migration 0009: Volunteer requests
-- Allows a volunteer (client role) to express interest in being a model for a student.
-- The student then has a list of available volunteers they can reach out to.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.volunteer_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message      TEXT,                            -- optional note from the volunteer
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, volunteer_id)             -- one active request per student–volunteer pair
);

ALTER TABLE public.volunteer_requests ENABLE ROW LEVEL SECURITY;

-- Volunteers can read and manage their own outgoing requests
CREATE POLICY "volunteer_requests_read_own_volunteer"
  ON public.volunteer_requests FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "volunteer_requests_insert_own_volunteer"
  ON public.volunteer_requests FOR INSERT
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "volunteer_requests_delete_own_volunteer"
  ON public.volunteer_requests FOR DELETE
  USING (auth.uid() = volunteer_id);

-- Students can read incoming requests and update status (accept/decline)
CREATE POLICY "volunteer_requests_read_own_student"
  ON public.volunteer_requests FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "volunteer_requests_update_own_student"
  ON public.volunteer_requests FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Auto-update updated_at
CREATE TRIGGER volunteer_requests_updated_at
  BEFORE UPDATE ON public.volunteer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
