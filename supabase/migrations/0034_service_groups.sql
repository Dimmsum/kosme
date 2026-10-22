-- Migration 0034: Service groups + category colour/description/order
-- Run in Supabase SQL Editor AFTER 0033_programme_requirements.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY (SFB-4): the catalogue is one long flat list of categories. Super Admin
-- wants broader collapsible sections (Hair, Skin, Nails, …), an editable colour
-- per category heading, and a category description.
--
-- service_categories.id stays the immutable text key: services, appointments
-- and client profiles (services_willing) store it as plain text, so renaming it
-- would orphan history. Admins never type it any more — it is generated from
-- the display name (label) on create.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_groups (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.service_groups ENABLE ROW LEVEL SECURITY;
-- No policies — service-role access only (see 0014).

INSERT INTO public.service_groups (id, name, sort_order) VALUES
  ('hair',      'Hair',       10),
  ('skin',      'Skin',       20),
  ('nails',     'Nails',      30),
  ('makeup',    'Makeup',     40),
  ('barbering', 'Barbering',  50),
  ('spa-body',  'Spa / Body', 60)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS group_id    TEXT REFERENCES public.service_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS colour      TEXT CHECK (colour ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS sort_order  INT NOT NULL DEFAULT 0;

-- All eight seeded categories are hair services (0003). Give them distinct
-- default colours so headings are distinguishable out of the box.
UPDATE public.service_categories SET group_id = 'hair' WHERE group_id IS NULL AND id IN
  ('Haircuts', 'Colour', 'Styling', 'Scalp Treatments', 'Blow-dry', 'Perming', 'Hair Extensions', 'Braiding');

UPDATE public.service_categories SET colour = '#ee0384', sort_order = 10 WHERE id = 'Haircuts'         AND colour IS NULL;
UPDATE public.service_categories SET colour = '#7c3aed', sort_order = 20 WHERE id = 'Colour'           AND colour IS NULL;
UPDATE public.service_categories SET colour = '#0891b2', sort_order = 30 WHERE id = 'Styling'          AND colour IS NULL;
UPDATE public.service_categories SET colour = '#059669', sort_order = 40 WHERE id = 'Scalp Treatments' AND colour IS NULL;
UPDATE public.service_categories SET colour = '#d97706', sort_order = 50 WHERE id = 'Blow-dry'         AND colour IS NULL;
UPDATE public.service_categories SET colour = '#db2777', sort_order = 60 WHERE id = 'Perming'         AND colour IS NULL;
UPDATE public.service_categories SET colour = '#2563eb', sort_order = 70 WHERE id = 'Hair Extensions'  AND colour IS NULL;
UPDATE public.service_categories SET colour = '#9333ea', sort_order = 80 WHERE id = 'Braiding'         AND colour IS NULL;
