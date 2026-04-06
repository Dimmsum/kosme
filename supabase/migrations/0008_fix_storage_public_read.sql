-- Migration 0008: Fix service-photos bucket public read access
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY:
--   Photos uploaded by students return 400 Bad Request when accessed via the
--   public Supabase storage URL.  Two root causes:
--
--   1. Migration 0006 used ON CONFLICT DO NOTHING — if the bucket existed
--      before as private, it would remain private and public URLs would fail.
--      Force-update the bucket to public.
--
--   2. No SELECT policy existed on storage.objects for this bucket, meaning
--      even public bucket reads could be blocked depending on Supabase version
--      and RLS configuration.  Add an explicit public SELECT policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure the bucket is marked public (idempotent)
UPDATE storage.buckets
SET public = true
WHERE id = 'service-photos';

-- 2. Allow anyone (including unauthenticated) to read objects in this bucket
CREATE POLICY "public_read_service_photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'service-photos');
