import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";
import { attachEducatorScope } from "../lib/educator-scope";

// Mounted at /api/events. Priority-tier rows drive the educator alert bell
// (ALT-3); the activity feed (ALT-2) is a separate endpoint on this router.
const router = Router();

// Cohort scoping (EDU-1): an assigned educator only sees, and can only
// acknowledge, events for students in their cohorts.
router.use(attachEducatorScope);

const SELECT =
  "id, tier, event_type, student_id, service_id, message, acknowledged_at, acknowledged_by, created_at, student:student_id ( id, full_name ), service:service_id ( id, name )";

const ACTIVITY_FEED_LIMIT = 50;

// GET /api/events/activity — non-urgent activity feed (service started/stopped),
// most recent first. Not dismissible — a log, not an inbox (see migration
// 0023_events.sql). Capped at ACTIVITY_FEED_LIMIT rows; no pagination for MVP.
router.get(
  "/activity",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    let query = supabaseAdmin
      .from("events")
      .select(SELECT)
      .eq("tier", "activity")
      .eq("is_demo", req.isDemo ?? false)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_FEED_LIMIT);
    if (req.educatorScope) query = query.in("student_id", req.educatorScope);

    const { data, error } = await query;
    if (error) {
      console.error("events GET /activity error:", error);
      return res.status(500).json({ error: "Failed to load activity feed" });
    }

    return res.json({ events: data ?? [] });
  },
);

// GET /api/events/priority — priority alerts, most recent first. `?unacknowledged=true`
// filters to only the ones still needing attention (drives the bell badge count).
router.get(
  "/priority",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    let query = supabaseAdmin
      .from("events")
      .select(SELECT)
      .eq("tier", "priority")
      .eq("is_demo", req.isDemo ?? false)
      .order("created_at", { ascending: false });

    if (req.query.unacknowledged === "true") {
      query = query.is("acknowledged_at", null);
    }
    if (req.educatorScope) query = query.in("student_id", req.educatorScope);

    const { data, error } = await query;
    if (error) {
      console.error("events GET /priority error:", error);
      return res.status(500).json({ error: "Failed to load alerts" });
    }

    return res.json({ events: data ?? [] });
  },
);

// POST /api/events/:id/acknowledge — dismiss a priority alert.
router.post(
  "/:id/acknowledge",
  requireRole("educator"),
  async (req: AuthRequest, res: Response) => {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    let query = supabaseAdmin
      .from("events")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: req.userId })
      .eq("id", req.params.id)
      .eq("tier", "priority")
      .eq("is_demo", req.isDemo ?? false);
    if (req.educatorScope) query = query.in("student_id", req.educatorScope);

    const { data, error } = await query.select(SELECT).single();

    if (error || !data) {
      return res.status(error ? 500 : 404).json({ error: error ? "Failed to acknowledge alert" : "Alert not found" });
    }

    return res.json({ event: data });
  },
);

export default router;
