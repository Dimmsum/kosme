import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";

const router = Router();

const FIELDS = "id, student_id, client_id, sender_id, body, read_at, created_at";

/** The two ids of a thread, keyed student/client whichever side the caller is. */
function pair(req: AuthRequest, otherId: string) {
  return req.userRole === "student"
    ? { student_id: req.userId!, client_id: otherId }
    : { student_id: otherId, client_id: req.userId! };
}

/**
 * Who the caller may talk to. A student may message any volunteer client on
 * their side of the demo boundary (that is how a conversation starts); a
 * client may only reply into a thread a student began, or reach a student
 * they already share a booking or accepted request with.
 */
async function canMessage(req: AuthRequest, otherId: string): Promise<boolean> {
  const wantedRole = req.userRole === "student" ? "client" : "student";
  const { data: other } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", otherId)
    .eq("role", wantedRole)
    .eq("is_demo", req.isDemo ?? false)
    .maybeSingle();
  if (!other) return false;
  if (req.userRole === "student") return true;

  const ids = pair(req, otherId);
  const { count: threadCount } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .match(ids);
  if ((threadCount ?? 0) > 0) return true;

  const { count: apptCount } = await supabaseAdmin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .match(ids);
  if ((apptCount ?? 0) > 0) return true;

  const { count: requestCount } = await supabaseAdmin
    .from("volunteer_requests")
    .select("id", { count: "exact", head: true })
    .eq("student_id", ids.student_id)
    .eq("volunteer_id", ids.client_id)
    .eq("status", "accepted");
  return (requestCount ?? 0) > 0;
}

// GET /api/messages/threads — the caller's conversations, newest first, with
// the last message and how many are unread.
router.get("/threads", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const mine = req.userRole === "student" ? "student_id" : "client_id";
  const theirs = req.userRole === "student" ? "client_id" : "student_id";

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select(FIELDS)
    .eq(mine, req.userId!)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("messages threads error:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }

  const byOther = new Map<
    string,
    { other_id: string; last: (typeof data)[number]; unread: number }
  >();
  for (const m of data ?? []) {
    const otherId = m[theirs] as string;
    const entry = byOther.get(otherId) ?? { other_id: otherId, last: m, unread: 0 };
    if (m.sender_id !== req.userId && !m.read_at) entry.unread += 1;
    byOther.set(otherId, entry);
  }

  const otherIds = Array.from(byOther.keys());
  const names = new Map<string, string | null>();
  if (otherIds.length > 0) {
    const { data: people } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name")
      .in("id", otherIds);
    for (const p of people ?? []) names.set(p.id, p.full_name);
  }

  const threads = Array.from(byOther.values()).map((t) => ({
    other_id: t.other_id,
    other_name: names.get(t.other_id) ?? null,
    last_message: t.last.body,
    last_at: t.last.created_at,
    last_from_me: t.last.sender_id === req.userId,
    unread: t.unread,
  }));
  return res.json({ threads });
});

// GET /api/messages/unread-count — for the nav badge
router.get("/unread-count", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  const mine = req.userRole === "student" ? "student_id" : "client_id";
  const { count } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq(mine, req.userId!)
    .neq("sender_id", req.userId!)
    .is("read_at", null);
  return res.json({ unread: count ?? 0 });
});

// GET /api/messages/thread/:otherId — messages with one person, oldest first.
// Opening a thread marks what the caller received as read.
router.get("/thread/:otherId", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.otherId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const ids = pair(req, req.params.otherId);

  const { data: other } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, is_demo")
    .eq("id", req.params.otherId)
    .maybeSingle();
  if (!other || other.is_demo !== (req.isDemo ?? false)) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select(FIELDS)
    .match(ids)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error("messages thread error:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }

  await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .match(ids)
    .neq("sender_id", req.userId!)
    .is("read_at", null);

  return res.json({ other: { id: other.id, full_name: other.full_name }, messages: data ?? [] });
});

// POST /api/messages/thread/:otherId — send a message
router.post("/thread/:otherId", requireRole("student", "client"), async (req: AuthRequest, res: Response) => {
  if (!isUuid(req.params.otherId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const { body } = req.body as { body?: unknown };
  if (typeof body !== "string" || !body.trim() || body.length > 1000) {
    return res.status(400).json({ error: "Message must be between 1 and 1000 characters" });
  }
  if (!(await canMessage(req, req.params.otherId))) {
    return res.status(403).json({ error: "You can't message this person" });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ ...pair(req, req.params.otherId), sender_id: req.userId!, body: body.trim() })
    .select(FIELDS)
    .single();
  if (error) {
    console.error("messages POST error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
  return res.status(201).json({ message: data });
});

export default router;
