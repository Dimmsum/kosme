import { Router, Response } from "express";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "../lib/supabase";
import { clerkClient } from "../lib/clerk";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";

// "Add My Client" (SFB-7): a student records a client of their own, who may not
// have a Kosmè account yet. Bookings with them go through POST /api/appointments
// with student_client_id; the client confirms the booking once they have an
// account and have claimed the invite.
const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELECT = "id, full_name, email, phone, invite_token, client_user_id, claimed_at, created_at";

// GET /api/student-clients — the student's own clients.
router.get("/", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("student_clients")
    .select(SELECT)
    .eq("student_id", req.userId!)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("student-clients GET error:", error);
    return res.status(500).json({ error: "Failed to load clients" });
  }
  return res.json({ clients: data ?? [] });
});

// POST /api/student-clients — add a client by name plus email and/or phone. If the
// email already belongs to a Kosmè client account in the same (demo/real) world,
// they are linked straight away; otherwise the student shares the invite link.
router.post("/", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { full_name, email, phone } = req.body as Record<string, unknown>;
  if (typeof full_name !== "string" || !full_name.trim() || full_name.length > 255) {
    return res.status(400).json({ error: "full_name must be between 1 and 255 characters" });
  }
  if (email != null && (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 255)) {
    return res.status(400).json({ error: "email must be a valid email address" });
  }
  if (phone != null && (typeof phone !== "string" || phone.length > 20)) {
    return res.status(400).json({ error: "phone must be a string up to 20 characters" });
  }
  const cleanEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
  const cleanPhone = typeof phone === "string" && phone.trim() ? phone.trim() : null;
  if (!cleanEmail && !cleanPhone) {
    return res.status(400).json({ error: "Provide an email or a phone number so the client can be reached" });
  }

  // Best-effort match to an existing client account by email (Clerk holds emails).
  let clientUserId: string | null = null;
  if (cleanEmail) {
    try {
      const { data: users } = await clerkClient.users.getUserList({ emailAddress: [cleanEmail] });
      if (users[0]) {
        const { data: profile } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("clerk_id", users[0].id)
          .eq("role", "client")
          .eq("is_demo", req.isDemo ?? false)
          .eq("status", "active")
          .maybeSingle();
        clientUserId = profile?.id ?? null;
      }
    } catch (err) {
      console.error("student-clients email lookup error:", err);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("student_clients")
    .insert({
      student_id: req.userId!,
      full_name: full_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      invite_token: randomBytes(18).toString("hex"),
      client_user_id: clientUserId,
      claimed_at: clientUserId ? new Date().toISOString() : null,
    })
    .select(SELECT)
    .single();
  if (error) {
    console.error("student-clients POST error:", error);
    return res.status(500).json({ error: "Failed to add client" });
  }
  return res.status(201).json({ client: data });
});

// DELETE /api/student-clients/:id — remove a client with no bookings.
router.delete("/:id", requireRole("student"), async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Invalid client id" });
  const { count } = await supabaseAdmin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("student_client_id", req.params.id);
  if ((count ?? 0) > 0) return res.status(409).json({ error: "This client has bookings and can't be removed" });
  const { error } = await supabaseAdmin.from("student_clients").delete().eq("id", req.params.id).eq("student_id", req.userId!);
  if (error) return res.status(500).json({ error: "Failed to remove client" });
  return res.json({ ok: true });
});

// POST /api/student-clients/claim — a client account accepts an invite from the
// link the student shared. Their pending bookings from that student attach to
// them so they can confirm.
router.post("/claim", requireRole("client"), async (req: AuthRequest, res: Response) => {
  const { token } = req.body as { token?: unknown };
  if (typeof token !== "string" || !/^[0-9a-f]{20,64}$/.test(token)) {
    return res.status(400).json({ error: "Invalid invite" });
  }
  const { data: sc } = await supabaseAdmin
    .from("student_clients")
    .select("id, student_id, client_user_id, student:student_id ( is_demo )")
    .eq("invite_token", token)
    .maybeSingle();
  if (!sc) return res.status(404).json({ error: "Invite not found" });
  const studentIsDemo = (sc as unknown as { student: { is_demo: boolean } | null }).student?.is_demo ?? false;
  if (studentIsDemo !== (req.isDemo ?? false)) return res.status(404).json({ error: "Invite not found" });
  if (sc.client_user_id && sc.client_user_id !== req.userId) {
    return res.status(409).json({ error: "This invite has already been used" });
  }

  const { error } = await supabaseAdmin
    .from("student_clients")
    .update({ client_user_id: req.userId!, claimed_at: new Date().toISOString() })
    .eq("id", sc.id);
  if (error) {
    console.error("student-clients claim error:", error);
    return res.status(500).json({ error: "Failed to accept invite" });
  }
  const { data: attached } = await supabaseAdmin
    .from("appointments")
    .update({ client_id: req.userId! })
    .eq("student_client_id", sc.id)
    .is("client_id", null)
    .select("id");
  return res.json({ ok: true, bookings: attached?.length ?? 0 });
});

export default router;
