import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";
import { parseAvailability } from "../lib/availability";

const router = Router();

const PROFILE_FIELDS =
  "bio, location, willing_to_travel, services_willing, availability, is_listed";

// GET /api/client-profile/me — the client's own profile (empty defaults if unset)
router.get("/me", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", req.userId!)
    .maybeSingle();
  if (error) {
    console.error("client-profile GET me error:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
  return res.json({
    profile: data ?? {
      bio: null,
      location: null,
      willing_to_travel: false,
      services_willing: [],
      availability: [],
      is_listed: true,
    },
  });
});

// PUT /api/client-profile/me — create or replace the client's own profile
router.put("/me", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { bio, location, willing_to_travel, services_willing, availability, is_listed } =
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
    !Array.isArray(services_willing) ||
    services_willing.length > 20 ||
    services_willing.some((s) => typeof s !== "string")
  ) {
    return res.status(400).json({ error: "services_willing must be a list of categories" });
  }
  const windows = parseAvailability(availability);
  if (typeof windows === "string") {
    return res.status(400).json({ error: windows });
  }

  // Only real catalog categories, so students can filter on them reliably.
  const wanted = Array.from(new Set(services_willing as string[]));
  if (wanted.length > 0) {
    const { data: cats } = await supabaseAdmin
      .from("service_categories")
      .select("id")
      .in("id", wanted);
    if ((cats ?? []).length !== wanted.length) {
      return res.status(400).json({ error: "services_willing contains an unknown category" });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .upsert(
      {
        user_id: req.userId!,
        bio: typeof bio === "string" ? bio.trim() || null : null,
        location: typeof location === "string" ? location.trim() || null : null,
        willing_to_travel,
        services_willing: wanted,
        availability: windows,
        is_listed,
      },
      { onConflict: "user_id" },
    )
    .select(PROFILE_FIELDS)
    .single();

  if (error) {
    console.error("client-profile PUT me error:", error);
    return res.status(500).json({ error: "Failed to save profile" });
  }
  return res.json({ profile: data });
});

// GET /api/client-profile/directory — listed volunteer clients (students only).
// Demo students only see demo clients and vice versa.
router.get("/directory", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("client_profiles")
    .select(`${PROFILE_FIELDS}, user:user_id!inner ( id, full_name, is_demo )`)
    .eq("is_listed", true)
    .eq("user.is_demo", req.isDemo ?? false);

  if (error) {
    console.error("client-profile directory error:", error);
    return res.status(500).json({ error: "Failed to fetch volunteers" });
  }

  const volunteers = (data ?? []).map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    const { user: _user, ...profile } = row;
    return { id: (user as { id: string }).id, full_name: (user as { full_name: string | null }).full_name, ...profile };
  });
  return res.json({ volunteers });
});

// GET /api/client-profile/:id — one listed volunteer's profile (students only)
router.get("/:id", requireRole("student"), async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: "Invalid volunteer id" });
  }
  const { data: user } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, is_demo")
    .eq("id", req.params.id)
    .eq("role", "client")
    .maybeSingle();
  if (!user || user.is_demo !== (req.isDemo ?? false)) {
    return res.status(404).json({ error: "Volunteer not found" });
  }

  const { data: profile } = await supabaseAdmin
    .from("client_profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile && !profile.is_listed) {
    return res.status(404).json({ error: "Volunteer not found" });
  }

  return res.json({
    volunteer: {
      id: user.id,
      full_name: user.full_name,
      ...(profile ?? {
        bio: null,
        location: null,
        willing_to_travel: false,
        services_willing: [],
        availability: [],
        is_listed: true,
      }),
    },
  });
});

export default router;
