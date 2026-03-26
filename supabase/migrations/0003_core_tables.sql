-- Migration 0003: Core application tables
-- Run this in your Supabase SQL Editor AFTER 0002_user_roles.sql
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Institutions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institutions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institutions_readable_by_all"
  ON public.institutions FOR SELECT
  USING (true);


-- 2. Programmes (belong to institutions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.programmes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id          UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  required_services_count INT  NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programmes_readable_by_all"
  ON public.programmes FOR SELECT
  USING (true);


-- 3. Service categories (lookup table — like roles)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_categories (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.service_categories (id, label) VALUES
  ('Haircuts',         'Haircuts'),
  ('Colour',           'Colour'),
  ('Styling',          'Styling'),
  ('Scalp Treatments', 'Scalp Treatments'),
  ('Blow-dry',         'Blow-dry'),
  ('Perming',          'Perming'),
  ('Hair Extensions',  'Hair Extensions'),
  ('Braiding',         'Braiding')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_categories_readable_by_all"
  ON public.service_categories FOR SELECT
  USING (true);


-- 4. User profiles (one per auth user)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT,
  phone          TEXT,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "user_profiles_read_own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Employers and educators can read student profiles for browse/verification
CREATE POLICY "user_profiles_read_by_employer_or_educator"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('employer', 'educator')
    )
  );

-- Trigger: auto-create user_profiles entry when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


-- 5. Services
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  category_id TEXT NOT NULL REFERENCES public.service_categories(id),
  name        TEXT NOT NULL,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'awaiting_client'
              CHECK (status IN ('awaiting_client', 'awaiting_educator', 'verified', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Students read their own services
CREATE POLICY "services_read_own_student"
  ON public.services FOR SELECT
  USING (auth.uid() = student_id);

-- Clients/volunteers read services where they are the client
CREATE POLICY "services_read_as_client"
  ON public.services FOR SELECT
  USING (auth.uid() = client_id);

-- Educators read all services (needed to see pending verifications)
CREATE POLICY "services_read_by_educator"
  ON public.services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'educator'
    )
  );

-- Employers read verified services only (for portfolio browse)
CREATE POLICY "services_read_verified_by_employer"
  ON public.services FOR SELECT
  USING (
    status = 'verified'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'employer'
    )
  );

-- Students insert their own services
CREATE POLICY "services_insert_own"
  ON public.services FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 6. Service photos
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('before', 'after')),
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_photos_read_via_service"
  ON public.service_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id
        AND (
          s.student_id = auth.uid()
          OR s.client_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('educator', 'employer'))
        )
    )
  );

CREATE POLICY "service_photos_insert_by_student"
  ON public.service_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND s.student_id = auth.uid()
    )
  );


-- 7. Confirmations (volunteer confirms that the service took place)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.confirmations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   UUID NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'disputed')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "confirmations_read_own_volunteer"
  ON public.confirmations FOR SELECT
  USING (auth.uid() = volunteer_id);

CREATE POLICY "confirmations_read_by_educator"
  ON public.confirmations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'educator')
  );

CREATE TRIGGER confirmations_updated_at
  BEFORE UPDATE ON public.confirmations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 8. Verifications (educator verifies student competence)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  educator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'verified', 'rejected')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verifications_read_own_educator"
  ON public.verifications FOR SELECT
  USING (auth.uid() = educator_id);

CREATE POLICY "verifications_read_by_student"
  ON public.verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND s.student_id = auth.uid()
    )
  );

CREATE TRIGGER verifications_updated_at
  BEFORE UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
