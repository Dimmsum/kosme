import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// POR-2: photos only surface in portfolio reads when the service has a
// `consent_records` row (CON-1, subject_type 'service') with photo_consent =
// true — captured by the student at log time for every client source. Fails
// closed: no row (e.g. services logged before POR-2) means photos are hidden.
// None of these reads select client details, so photos are the only thing to
// gate here.
async function photoConsentedIds(serviceIds: string[]): Promise<Set<string>> {
  if (serviceIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from("consent_records")
    .select("subject_id")
    .eq("subject_type", "service")
    .eq("photo_consent", true)
    .in("subject_id", serviceIds);
  if (error) {
    console.error("consent_records lookup error:", error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.subject_id as string));
}

async function withConsentGating<T extends { id: string; service_photos?: unknown[] }>(
  rows: T[],
): Promise<Array<T & { photo_consent: boolean }>> {
  const consented = await photoConsentedIds(rows.map((row) => row.id));
  return rows.map((row) => {
    const photo_consent = consented.has(row.id);
    return {
      ...row,
      service_photos: photo_consent ? row.service_photos : [],
      photo_consent,
    };
  });
}

// POR-3: count-based skill rollup of a student's verified services — per
// category, with a per-service-type breakdown. Built from the rows the
// portfolio reads already fetch (all `status = 'verified'`, per VER-9), so no
// extra query. Services with no service type (logged before migration 0017,
// or none picked) count toward their category but not any type.
type SkillSourceRow = {
  category_id: string;
  service_type?: { name: string } | { name: string }[] | null;
};

type SkillSummary = Array<{
  category: string;
  count: number;
  types: Array<{ name: string; count: number }>;
}>;

function summariseSkills(rows: SkillSourceRow[]): SkillSummary {
  const byCategory = new Map<string, { count: number; types: Map<string, number> }>();
  for (const row of rows) {
    const entry = byCategory.get(row.category_id) ?? { count: 0, types: new Map() };
    entry.count += 1;
    const type = Array.isArray(row.service_type) ? row.service_type[0] : row.service_type;
    if (type?.name) {
      entry.types.set(type.name, (entry.types.get(type.name) ?? 0) + 1);
    }
    byCategory.set(row.category_id, entry);
  }

  const byCountThenName = (a: { name: string; count: number }, b: { name: string; count: number }) =>
    b.count - a.count || a.name.localeCompare(b.name);

  return [...byCategory.entries()]
    .map(([category, { count, types }]) => ({
      category,
      count,
      types: [...types.entries()]
        .map(([name, typeCount]) => ({ name, count: typeCount }))
        .sort(byCountThenName),
    }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

// GET /api/portfolio — student's own verified services
router.get(
  "/",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("services")
      .select(
        `
      id, name, category_id, created_at,
      service_type:service_type_id ( name ),
      service_photos ( id, type, url ),
      verifications ( id, educator_id, created_at, educator:educator_id ( full_name ) )
    `,
      )
      .eq("student_id", req.userId!)
      .eq("status", "verified")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
    }

    return res.json({
      portfolio: await withConsentGating(data ?? []),
      skills: summariseSkills(data ?? []),
    });
  },
);

// PATCH /api/portfolio/:serviceId/photos — student updates photos for one service
router.patch(
  "/:serviceId/photos",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { serviceId } = req.params;
    const { photos } = req.body as { photos?: unknown };

    if (
      !Array.isArray(photos) ||
      !photos.every((photo) => typeof photo === "string")
    ) {
      return res.status(400).json({ error: "photos must be an array of URLs" });
    }

    const sanitizedPhotos = photos
      .map((photo) => photo.trim())
      .filter((photo) => photo.length > 0);

    if (sanitizedPhotos.length > 20) {
      return res
        .status(400)
        .json({ error: "A maximum of 20 photos is allowed" });
    }

    const invalidPhoto = sanitizedPhotos.find(
      (photo) => !/^https?:\/\//i.test(photo),
    );
    if (invalidPhoto) {
      return res
        .status(400)
        .json({ error: "All photos must be valid http(s) URLs" });
    }

    // Portfolio edits only apply to verified services — otherwise this route
    // could overwrite evidence photos on a service still awaiting review.
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("student_id", req.userId!)
      .eq("status", "verified")
      .single();

    if (serviceError || !service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("service_photos")
      .delete()
      .eq("service_id", serviceId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    if (sanitizedPhotos.length === 0) {
      return res.json({ photos: [] });
    }

    const rows = sanitizedPhotos.map((url, index) => ({
      service_id: serviceId,
      type: index % 2 === 0 ? "before" : "after",
      url,
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("service_photos")
      .insert(rows)
      .select("id, type, url");

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.json({ photos: inserted ?? [] });
  },
);

// GET /api/portfolio/browse — employer talent search
// Supports ?specialisation=Colour&institution_id=<uuid>
router.get(
  "/browse",
  requireRole("employer"),
  async (req: AuthRequest, res: Response) => {
    const { specialisation, institution_id } = req.query;

    // Get all students who have at least one verified service. A demo
    // employer only ever browses demo students, and real employers never see
    // demo students mixed into their search results.
    let query = supabaseAdmin
      .from("user_profiles")
      .select(
        `
      id, full_name, institution_id,
      institutions ( name ),
      services!services_student_id_fkey (
        id, category_id, status
      )
    `,
      )
      .eq("is_demo", req.isDemo ?? false)
      .not("services", "is", null);

    if (institution_id) {
      query = query.eq("institution_id", institution_id as string);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
    }

    // Build a summary per student: verified count, category list
    type ServiceRow = { id: string; category_id: string; status: string };
    type ProfileRow = {
      id: string;
      full_name: string | null;
      institution_id: string | null;
      institutions: { name: string } | null;
      services: ServiceRow[];
    };

    const results = (profiles as unknown as ProfileRow[])
      .map((p) => {
        const verified = p.services.filter((s) => s.status === "verified");
        const categories = [...new Set(verified.map((s) => s.category_id))];
        return {
          id: p.id,
          full_name: p.full_name,
          institution_id: p.institution_id,
          institution_name: p.institutions?.name ?? null,
          verified_count: verified.length,
          specialisations: categories,
        };
      })
      .filter((p) => {
        if (p.verified_count === 0) return false;
        if (
          specialisation &&
          !p.specialisations.includes(specialisation as string)
        )
          return false;
        return true;
      })
      .sort((a, b) => b.verified_count - a.verified_count);

    return res.json({ graduates: results });
  },
);

// GET /api/portfolio/feed — volunteer browsing feed (cursor-paginated verified services with photos)
router.get(
  "/feed",
  requireRole("client"),
  async (req: AuthRequest, res: Response) => {
    const cursor = req.query.cursor as string | undefined;
    const limit = 12;

    let query = supabaseAdmin
      .from("services")
      .select(
        `
      id, name, category_id, created_at,
      student:student_id!inner ( id, full_name ),
      service_photos ( id, type, url )
    `,
      )
      .eq("status", "verified")
      .eq("is_demo", req.isDemo ?? false)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) {
      console.error("DB error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    const items = data ?? [];
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? page[page.length - 1].created_at : null;

    return res.json({ feed: await withConsentGating(page), nextCursor });
  },
);

// GET /api/portfolio/:studentId — educator, employer, or volunteer client views a student's portfolio
router.get("/:studentId", async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  // Educators, employers, and volunteer clients can view others' portfolios
  if (!["educator", "employer", "client"].includes(req.userRole ?? "")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Also return the student's profile — checked first so demo viewers can't
  // reach a real student's portfolio (and vice versa) by guessing an id.
  // Restricted to role 'student' so a shared employer link (POR-5) can't be
  // pointed at an educator/employer/client id to read their name/institution.
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, institution_id, institutions ( name ), is_demo")
    .eq("id", studentId)
    .eq("role", "student")
    .single();

  if (!profile || (profile.is_demo ?? false) !== (req.isDemo ?? false)) {
    return res.status(404).json({ error: "Student not found" });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .select(
      `
      id, name, category_id, created_at,
      service_type:service_type_id ( name ),
      service_photos ( id, type, url ),
      verifications ( id, created_at, educator:educator_id ( full_name ) )
    `,
    )
    .eq("student_id", studentId)
    .eq("status", "verified")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("DB error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({
    student: profile,
    portfolio: await withConsentGating(data ?? []),
    skills: summariseSkills(data ?? []),
  });
});

export default router;
