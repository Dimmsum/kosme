-- Migration 0018: Seed service_types with real recommended durations
-- Run in Supabase SQL Editor AFTER 0015_admin_control_centre.sql (creates service_types)
-- and 0017_service_timer.sql (student flow reads these).
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: 0015 created service_types but left it empty, so the MVP #3 log form had an
-- empty Service Type dropdown and every stopped service tagged as null (no range to
-- compare against). This seeds a realistic catalog for the platform's actual domain
-- — hair services — mapped to the categories seeded in 0003 (Haircuts, Colour,
-- Styling, Scalp Treatments, Blow-dry, Perming, Hair Extensions, Braiding).
--
-- NOTE on the roadmap examples: Phase 4's "Basic Facial / Manicure / Soft Glam"
-- examples were illustrative from the original email and don't match the hair
-- categories actually in the DB — durations below are the real backfill for this
-- domain. recommended_duration_min/max drive the under|within|over tagging in
-- server/src/routes/services.ts (POST /:id/stop). required_practical_hours/count
-- are left at their 0 defaults here — that curriculum data is a separate concern
-- and is managed per-type from the admin Service Catalog UI.
--
-- Idempotent: a unique index on (category_id, name) lets the INSERT upsert, so
-- re-running refreshes durations without creating duplicate rows.
-- ─────────────────────────────────────────────────────────────────────────────


-- Uniqueness so ON CONFLICT can upsert (no two identical types in one category).
CREATE UNIQUE INDEX IF NOT EXISTS service_types_category_name_uidx
  ON public.service_types (category_id, name);


INSERT INTO public.service_types
  (category_id, name, recommended_duration_min, recommended_duration_max)
VALUES
  -- Haircuts
  ('Haircuts', 'Dry Cut (Short)',            30,  45),
  ('Haircuts', 'Cut & Blow-dry',             45,  75),
  ('Haircuts', 'Restyle / Long Layers',      60,  90),
  ('Haircuts', 'Fringe Trim',                15,  20),

  -- Colour
  ('Colour', 'Root Touch-up',                45,  75),
  ('Colour', 'Full Head Colour',             90, 150),
  ('Colour', 'Highlights / Foils',          120, 180),
  ('Colour', 'Balayage',                    150, 240),
  ('Colour', 'Toner / Gloss',                30,  45),

  -- Styling
  ('Styling', 'Special Occasion Updo',       60,  90),
  ('Styling', 'Curls / Waves',               45,  60),
  ('Styling', 'Braided Style',               45,  90),

  -- Scalp Treatments
  ('Scalp Treatments', 'Scalp Massage & Treatment', 30, 45),
  ('Scalp Treatments', 'Deep Conditioning Treatment', 30, 60),

  -- Blow-dry
  ('Blow-dry', 'Standard Blow-dry',          30,  45),
  ('Blow-dry', 'Round-brush Blow-dry',       45,  60),

  -- Perming
  ('Perming', 'Full Head Perm',              90, 150),
  ('Perming', 'Root Perm',                   60,  90),

  -- Hair Extensions
  ('Hair Extensions', 'Consultation & Fitting', 120, 240),
  ('Hair Extensions', 'Maintenance / Refit',     90, 150),
  ('Hair Extensions', 'Removal',                 45,  90),

  -- Braiding
  ('Braiding', 'Cornrows',                   60, 150),
  ('Braiding', 'Box Braids',                180, 360),
  ('Braiding', 'Knotless Braids',           240, 420)
ON CONFLICT (category_id, name) DO UPDATE SET
  recommended_duration_min = EXCLUDED.recommended_duration_min,
  recommended_duration_max = EXCLUDED.recommended_duration_max;
