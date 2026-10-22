import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { resolveRequirementsForStudent } from "../lib/requirements";

const router = Router();

type RowStatus =
  | "outstanding"
  | "in_progress"
  | "corrections_requested"
  | "awaiting_client"
  | "awaiting_educator"
  | "verified"
  | "rejected";

// Higher = further along. Used to pick the "best" attempt for a service type.
const STATUS_RANK: Record<RowStatus, number> = {
  outstanding: 0,
  rejected: 1,
  in_progress: 2,
  corrections_requested: 3,
  awaiting_client: 4,
  awaiting_educator: 5,
  verified: 6,
};

interface ServiceRow {
  id: string;
  category_id: string;
  service_type_id: string | null;
  status: RowStatus;
  created_at: string;
}

function rank(status: string): number {
  return STATUS_RANK[status as RowStatus] ?? 0;
}

// GET /api/progress — every required practical, per category, with the
// student's best status for each. The category target (`max_required`, the 63
// total) is larger than the number of catalog service types, so the remainder
// of each category is "Any other <category> service" slots that the student's
// other services (untyped or repeat attempts) fill, furthest-along first.
router.get("/", requireRole("student"), async (req: AuthRequest, res: Response) => {
  try {
    const [categoriesRes, typesRes, servicesRes, resolved] = await Promise.all([
      supabaseAdmin.from("service_categories").select("id, label, colour").order("sort_order").order("label"),
      supabaseAdmin.from("service_types").select("id, category_id, name").order("name"),
      supabaseAdmin
        .from("services")
        .select("id, category_id, service_type_id, status, created_at")
        .eq("student_id", req.userId!)
        .order("created_at", { ascending: false }),
      resolveRequirementsForStudent(req.userId!),
    ]);

    if (categoriesRes.error || typesRes.error || servicesRes.error) {
      console.error("progress error:", categoriesRes.error, typesRes.error, servicesRes.error);
      return res.status(500).json({ error: "Failed to fetch progress" });
    }

    const services = (servicesRes.data ?? []) as ServiceRow[];
    const types = typesRes.data ?? [];

    // Category targets come from the student's programme requirements (SFB-3);
    // categories the programme doesn't require are left out entirely.
    const requiredCategories = (categoriesRes.data ?? []).filter((c) => (resolved.categoryCounts[c.id as string] ?? 0) > 0);

    const categories = requiredCategories.map((rawCat) => {
      const cat = { ...rawCat, max_required: resolved.categoryCounts[rawCat.id as string] };
      const catTypes = types.filter((t) => t.category_id === cat.id);
      const catServices = services.filter((s) => s.category_id === cat.id);
      const used = new Set<string>();

      // One row per catalog type, showing the student's furthest attempt.
      const typedRows = catTypes.map((t) => {
        const best = catServices
          .filter((s) => s.service_type_id === t.id)
          .sort((a, b) => rank(b.status) - rank(a.status))[0];
        if (best) used.add(best.id);
        return {
          key: t.id,
          name: t.name,
          service_type_id: t.id as string | null,
          generic: false,
          status: (best?.status ?? "outstanding") as RowStatus,
          service_id: best?.id ?? null,
        };
      });

      // Remaining slots up to the category target, filled by leftover services.
      const slots = Math.max(0, cat.max_required - catTypes.length);
      const leftovers = catServices
        .filter((s) => !used.has(s.id))
        .sort((a, b) => rank(b.status) - rank(a.status));
      const genericRows = Array.from({ length: slots }, (_, i) => {
        const s = leftovers[i];
        return {
          key: `${cat.id}-other-${i + 1}`,
          name: `Any other ${cat.label} service`,
          service_type_id: null as string | null,
          generic: true,
          status: (s?.status ?? "outstanding") as RowStatus,
          service_id: s?.id ?? null,
        };
      });

      const rows = [...typedRows, ...genericRows];
      const verifiedInCategory = catServices.filter((s) => s.status === "verified").length;
      return {
        id: cat.id as string,
        label: cat.label as string,
        colour: (cat.colour ?? null) as string | null,
        max_required: cat.max_required as number,
        // Same cap the dashboard rings use: extras beyond the target don't count.
        completed: Math.min(verifiedInCategory, cat.max_required),
        rows,
      };
    });

    return res.json({
      total_required: categories.reduce((sum, c) => sum + c.max_required, 0),
      total_completed: categories.reduce((sum, c) => sum + c.completed, 0),
      categories,
    });
  } catch (err) {
    console.error("progress error:", err);
    return res.status(500).json({ error: "Failed to fetch progress" });
  }
});

export default router;
