import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { parseAvailability } from "../lib/availability";

const router = Router();

const PROFILE_FIELDS =
  "bio, location, willing_to_travel, services_offered, availability, is_listed";

const EMPTY_PROFILE = {
  bio: null,
  location: null,
  willing_to_travel: false,
  services_offered: [],
  availability: [],
  is_listed: true,
};

// GET /api/student-profile/me — the student's own listing (empty defaults if unset)
router.get("/me", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", req.userId!)
    .maybeSingle();
  if (error) {
    console.error("student-profile GET me error:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
  return res.json({ profile: data ?? EMPTY_PROFILE });
});

// PUT /api/student-profile/me — create or replace the student's own listing
router.put("/me", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { bio, location, willing_to_travel, services_offered, availability, is_listed } =
    req.body as Record<string, unknown>;

  if (bio != null && (typeof bio !== "string" || bio.length > 1000)) {
    return res.status(400).json({ error: "bio must be at most 1000 characters" });
  }
  if (location != null && (typeof location !== "string" || location.length > 120)) {
    return res.status(400).json({ error: "location must be at most 120 characters" });
  }
  if (typeof willing_to_travel !== "boolean" || typeof is_listed !== "boolean") {
    return res.status(400).json({ error: "willing_to_travel and is_listed must be true or false" });
  }
  if (
    !Array.isArray(services_offered) ||
    services_offered.length > 20 ||
    services_offered.some((s) => typeof s !== "string")
  ) {
    return res.status(400).json({ error: "services_offered must be a list of categories" });
  }
  const windows = parseAvailability(availability);
  if (typeof windows === "string") {
    return res.status(400).json({ error: windows });
  }

  // Only real catalog categories, so clients can filter on them reliably.
  const wanted = Array.from(new Set(services_offered as string[]));
  if (wanted.length > 0) {
    const { data: cats } = await supabaseAdmin
      .from("service_categories")
      .select("id")
      .in("id", wanted);
    if ((cats ?? []).length !== wanted.length) {
      return res.status(400).json({ error: "services_offered contains an unknown category" });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("student_profiles")
    .upsert(
      {
        user_id: req.userId!,
        bio: typeof bio === "string" ? bio.trim() || null : null,
        location: typeof location === "string" ? location.trim() || null : null,
        willing_to_travel,
        services_offered: wanted,
        availability: windows,
        is_listed,
      },
      { onConflict: "user_id" },
    )
    .select(PROFILE_FIELDS)
    .single();

  if (error) {
    console.error("student-profile PUT me error:", error);
    return res.status(500).json({ error: "Failed to save profile" });
  }
  return res.json({ profile: data });
});

export default router;
