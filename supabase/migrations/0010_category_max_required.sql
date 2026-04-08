-- Add max_required column to service_categories for progress tracking
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS max_required INTEGER NOT NULL DEFAULT 10;

UPDATE public.service_categories SET max_required = 15 WHERE id = 'Haircuts';
UPDATE public.service_categories SET max_required = 10 WHERE id = 'Colour';
UPDATE public.service_categories SET max_required = 10 WHERE id = 'Styling';
UPDATE public.service_categories SET max_required = 5  WHERE id = 'Scalp Treatments';
UPDATE public.service_categories SET max_required = 8  WHERE id = 'Blow-dry';
UPDATE public.service_categories SET max_required = 5  WHERE id = 'Perming';
UPDATE public.service_categories SET max_required = 5  WHERE id = 'Hair Extensions';
UPDATE public.service_categories SET max_required = 5  WHERE id = 'Braiding';
