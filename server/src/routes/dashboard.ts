import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";
import { summariseVerifiedHours } from "../lib/verified-hours";
import { educatorStudentScope } from "../lib/educator-scope";

const router = Router();

// GET /api/dashboard — role-aware stats for the current user's dashboard
router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const role = req.userRole;

  try {
    if (role === "student") {
      // Count services by status
      const { data: services } = await supabaseAdmin
        .from("services")
        .select("id, status, category_id, service_type_id, actual_duration_min, adjusted_duration_min")
        .eq("student_id", userId);

      const all = services ?? [];
      const verified = all.filter((s) => s.status === "verified");
      const awaiting_educator = all.filter((s) => s.status === "awaiting_educator");
      const awaiting_client = all.filter((s) => s.status === "awaiting_client");

      // Per-category verified count
      const byCategory: Record<string, number> = {};
      for (const s of verified) {
        byCategory[s.category_id] = (byCategory[s.category_id] ?? 0) + 1;
      }

      // POR-6: progress toward the per-type practical requirements set in the
      // admin Service Catalog. Types with no requirement (both 0, the seeded
      // default) are left out.
      const { data: requiredTypes } = await supabaseAdmin
        .from("service_types")
        .select("id, category_id, name, required_practical_hours, required_practical_count")
        .or("required_practical_hours.gt.0,required_practical_count.gt.0")
        .order("category_id")
        .order("name");

      const requirements = (requiredTypes ?? []).map((t) => {
        const done = verified.filter((s) => s.service_type_id === t.id);
        return {
          service_type_id: t.id,
          name: t.name,
          category_id: t.category_id,
          required_hours: t.required_practical_hours,
          required_count: t.required_practical_count,
          verified_count: done.length,
          ...summariseVerifiedHours(done),
        };
      });

      return res.json({
        role,
        stats: {
          total: all.length,
          verified: verified.length,
          awaiting_educator: awaiting_educator.length,
          awaiting_client: awaiting_client.length,
          by_category: byCategory,
          hours: summariseVerifiedHours(verified),
          requirements,
        },
      });
    }

    if (role === "educator") {
      // Demo educators only ever see demo services, and real educators never
      // see demo services — keeps the public demo login from exposing real
      // student submissions (or polluting real educators' queues with demo noise).
      // The pending count also follows cohort scoping (EDU-1) so it matches
      // GET /api/verifications/pending. The verified counts below are the
      // educator's own decisions, so they need no scoping.
      const scope = await educatorStudentScope(userId);
      let pendingQuery = supabaseAdmin
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("status", "awaiting_educator")
        .eq("is_demo", req.isDemo ?? false);
      if (scope) pendingQuery = pendingQuery.in("student_id", scope);
      const { count: pending } = await pendingQuery;

      const { count: totalVerified } = await supabaseAdmin
        .from("verifications")
        .select("*", { count: "exact", head: true })
        .eq("educator_id", userId)
        .eq("status", "verified");

      // This week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: thisWeek } = await supabaseAdmin
        .from("verifications")
        .select("*", { count: "exact", head: true })
        .eq("educator_id", userId)
        .eq("status", "verified")
        .gte("created_at", weekAgo.toISOString());

      return res.json({
        role,
        stats: {
          pending_verifications: pending ?? 0,
          total_verified: totalVerified ?? 0,
          verified_this_week: thisWeek ?? 0,
        },
      });
    }

    if (role === "client") {
      const { count: pending } = await supabaseAdmin
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("client_id", userId)
        .eq("status", "awaiting_client");

      const { count: total } = await supabaseAdmin
        .from("confirmations")
        .select("*", { count: "exact", head: true })
        .eq("volunteer_id", userId);

      // This month
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const { count: thisMonth } = await supabaseAdmin
        .from("confirmations")
        .select("*", { count: "exact", head: true })
        .eq("volunteer_id", userId)
        .gte("created_at", monthAgo.toISOString());

      return res.json({
        role,
        stats: {
          pending_confirmations: pending ?? 0,
          total_services_received: total ?? 0,
          this_month: thisMonth ?? 0,
        },
      });
    }

    if (role === "employer") {
      const { count: shortlisted } = await supabaseAdmin
        .from("shortlist")
        .select("*", { count: "exact", head: true })
        .eq("employer_id", userId);

      // Count of students with at least 1 verified service (new graduates in the past 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: recentVerified } = await supabaseAdmin
        .from("services")
        .select("student_id")
        .eq("status", "verified")
        .eq("is_demo", req.isDemo ?? false)
        .gte("updated_at", thirtyDaysAgo.toISOString());

      const newGraduateIds = new Set((recentVerified ?? []).map((s) => s.student_id));

      return res.json({
        role,
        stats: {
          shortlisted: shortlisted ?? 0,
          new_graduates: newGraduateIds.size,
        },
      });
    }

    return res.status(400).json({ error: "Unknown role" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;
