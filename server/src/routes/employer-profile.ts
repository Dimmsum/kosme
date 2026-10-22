import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { parseEmployerFields } from "../lib/employer-profile";

// An employer's own business details. verification_status is read-only here —
// only Super Admin can change it (routes/admin/employers.ts).
const router = Router();

const SELECT = "business_name, contact_person, location, business_type, verification_status";

router.get("/", requireRole("employer"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin.from("employer_profiles").select(SELECT).eq("user_id", req.userId!).maybeSingle();
  if (error) {
    console.error("employer-profile GET error:", error);
    return res.status(500).json({ error: "Failed to load business details" });
  }
  return res.json({
    business: data ?? { business_name: null, contact_person: null, location: null, business_type: null, verification_status: "pending" },
  });
});

router.put("/", requireRole("employer"), async (req: AuthRequest, res: Response) => {
  const parsed = parseEmployerFields(req.body ?? {});
  if ("error" in parsed) return res.status(400).json({ error: parsed.error });
  const { data, error } = await supabaseAdmin
    .from("employer_profiles")
    .upsert({ user_id: req.userId!, ...parsed.updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select(SELECT)
    .single();
  if (error) {
    console.error("employer-profile PUT error:", error);
    return res.status(500).json({ error: "Failed to save business details" });
  }
  return res.json({ business: data });
});

export default router;
