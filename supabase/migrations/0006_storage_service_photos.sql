-- Create service-photos storage bucket for student work documentation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  10485760, -- 10 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Students can upload into their own folder: {userId}/{serviceId}/...
CREATE POLICY "students_upload_service_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'service-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Students can delete their own photos
CREATE POLICY "students_delete_service_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
