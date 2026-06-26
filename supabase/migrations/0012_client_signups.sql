-- Client sign-up form submissions from the /clients page (no auth required)
CREATE TABLE IF NOT EXISTS public.client_signups (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name               TEXT NOT NULL,
  gender                  TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  whatsapp                TEXT NOT NULL,
  email                   TEXT NOT NULL,
  parish                  TEXT NOT NULL,
  service_preferences     TEXT[] NOT NULL DEFAULT '{}',
  availability            TEXT[] NOT NULL DEFAULT '{}',
  preferred_time          TEXT[] NOT NULL DEFAULT '{}',
  willing_to_travel       BOOLEAN NOT NULL,
  photo_consent           BOOLEAN NOT NULL,
  trainee_acknowledgement BOOLEAN NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow anonymous inserts (no RLS restriction needed — server uses service role key)
ALTER TABLE public.client_signups ENABLE ROW LEVEL SECURITY;

-- Only service-role (server) can insert and read; no public access
CREATE POLICY "service role only" ON public.client_signups
  USING (false)
  WITH CHECK (false);
