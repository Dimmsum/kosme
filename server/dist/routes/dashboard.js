"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// GET /api/dashboard — role-aware stats for the current user's dashboard
router.get("/", async (req, res) => {
    const userId = req.userId;
    const role = req.userRole;
    try {
        if (role === "student") {
            // Count services by status
            const { data: services } = await supabase_1.supabaseAdmin
                .from("services")
                .select("id, status, category_id")
                .eq("student_id", userId);
            const all = services ?? [];
            const verified = all.filter((s) => s.status === "verified");
            const awaiting_educator = all.filter((s) => s.status === "awaiting_educator");
            const awaiting_client = all.filter((s) => s.status === "awaiting_client");
            // Per-category verified count
            const byCategory = {};
            for (const s of verified) {
                byCategory[s.category_id] = (byCategory[s.category_id] ?? 0) + 1;
            }
            return res.json({
                role,
                stats: {
                    total: all.length,
                    verified: verified.length,
                    awaiting_educator: awaiting_educator.length,
                    awaiting_client: awaiting_client.length,
                    by_category: byCategory,
                },
            });
        }
        if (role === "educator") {
            const { count: pending } = await supabase_1.supabaseAdmin
                .from("services")
                .select("*", { count: "exact", head: true })
                .eq("status", "awaiting_educator");
            const { count: totalVerified } = await supabase_1.supabaseAdmin
                .from("verifications")
                .select("*", { count: "exact", head: true })
                .eq("educator_id", userId)
                .eq("status", "verified");
            // This week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const { count: thisWeek } = await supabase_1.supabaseAdmin
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
            const { count: pending } = await supabase_1.supabaseAdmin
                .from("services")
                .select("*", { count: "exact", head: true })
                .eq("client_id", userId)
                .eq("status", "awaiting_client");
            const { count: total } = await supabase_1.supabaseAdmin
                .from("confirmations")
                .select("*", { count: "exact", head: true })
                .eq("volunteer_id", userId);
            // This month
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const { count: thisMonth } = await supabase_1.supabaseAdmin
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
            const { count: shortlisted } = await supabase_1.supabaseAdmin
                .from("shortlist")
                .select("*", { count: "exact", head: true })
                .eq("employer_id", userId);
            // Count of students with at least 1 verified service (new graduates in the past 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const { data: recentVerified } = await supabase_1.supabaseAdmin
                .from("services")
                .select("student_id")
                .eq("status", "verified")
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
    }
    catch (err) {
        return res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});
exports.default = router;
