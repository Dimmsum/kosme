-- Migration 0026: One running timer per student (VER-15)
-- Run in Supabase SQL Editor AFTER 0025_client_matches.sql
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY: the service timer (0017) never limited how many services a student
-- could have `in_progress` at once. The client only ever showed the first one,
-- so a second timer could run unseen. The API now rejects a second start with
-- a 409; this index makes the database enforce the same rule so two tabs
-- racing each other can't both win.
--
-- DESIGN: a partial unique index on student_id where status = 'in_progress'.
-- Historic rows are untouched. If any student already has more than one
-- running service the index can't be built, so this aborts with a message
-- instead of guessing which timer to stop: stop the extras in the app (or set
-- them to the right status by hand) and re-run.
--
-- RLS: no change.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  dupes INTEGER;
BEGIN
  SELECT COUNT(*) INTO dupes FROM (
    SELECT student_id
    FROM public.services
    WHERE status = 'in_progress'
    GROUP BY student_id
    HAVING COUNT(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      '% student(s) have more than one in_progress service. Resolve them first (see 0026 header).', dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS services_one_active_timer_per_student
  ON public.services (student_id)
  WHERE status = 'in_progress';
