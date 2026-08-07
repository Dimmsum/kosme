import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";

// Mounted at /api/admin/clients (super_admin only). Read-only views over the
// volunteer-client side: public sign-up form submissions (client_signups) and
// volunteer↔student requests (volunteer_requests).
const router = Router();

// GET /signups — public volunteer-client sign-up submissions, newest first.
router.get("/signups", async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("client_signups")
    .select(
      "id, full_name, gender, whatsapp, email, parish, service_preferences, availability, preferred_time, willing_to_travel, photo_consent, trainee_acknowledgement, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("admin clients GET /signups error:", error);
    return res.status(500).json({ error: "Failed to load client sign-ups" });
  }
  return res.json({ signups: data ?? [] });
});

// GET /volunteer-requests?status= — volunteer→student interest requests.
router.get("/volunteer-requests", async (req: AuthRequest, res: Response) => {
  let query = supabaseAdmin
    .from("volunteer_requests")
    .select(
      "id, student_id, volunteer_id, message, status, created_at, student:student_id ( id, full_name ), volunteer:volunteer_id ( id, full_name )",
    )
    .order("created_at", { ascending: false });

  const { status } = req.query;
  if (typeof status === "string" && ["pending", "accepted", "declined"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin clients GET /volunteer-requests error:", error);
    return res.status(500).json({ error: "Failed to load volunteer requests" });
  }
  return res.json({ requests: data ?? [] });
});

export default router;
