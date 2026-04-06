"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/volunteer-requests — volunteer expresses interest in a student
router.post("/", (0, auth_1.requireRole)("client"), async (req, res) => {
    const { student_id, message } = req.body;
    if (!student_id) {
        return res.status(400).json({ error: "student_id is required" });
    }
    // Confirm target is actually a student
    const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("id, role")
        .eq("id", student_id)
        .eq("role", "student")
        .single();
    if (profileError || !profile) {
        return res.status(404).json({ error: "Student not found" });
    }
    const { data, error } = await supabase_1.supabaseAdmin
        .from("volunteer_requests")
        .upsert({
        student_id,
        volunteer_id: req.userId,
        message: message?.trim() || null,
        status: "pending",
    }, { onConflict: "student_id,volunteer_id", ignoreDuplicates: false })
        .select("id, student_id, volunteer_id, message, status, created_at")
        .single();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ request: data });
});
// DELETE /api/volunteer-requests/:id — volunteer withdraws their request
router.delete("/:id", (0, auth_1.requireRole)("client"), async (req, res) => {
    const { error } = await supabase_1.supabaseAdmin
        .from("volunteer_requests")
        .delete()
        .eq("id", req.params.id)
        .eq("volunteer_id", req.userId);
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(204).send();
});
// GET /api/volunteer-requests/my — volunteer sees their own outgoing requests
router.get("/my", (0, auth_1.requireRole)("client"), async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("volunteer_requests")
        .select(`
      id, message, status, created_at,
      student:student_id ( id, full_name )
    `)
        .eq("volunteer_id", req.userId)
        .order("created_at", { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json({ requests: data ?? [] });
});
// GET /api/volunteer-requests/incoming — student sees incoming volunteer requests
router.get("/incoming", (0, auth_1.requireRole)("student"), async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("volunteer_requests")
        .select(`
      id, message, status, created_at,
      volunteer:volunteer_id ( id, full_name, phone )
    `)
        .eq("student_id", req.userId)
        .order("created_at", { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json({ requests: data ?? [] });
});
// PATCH /api/volunteer-requests/:id — student accepts or declines a request
router.patch("/:id", (0, auth_1.requireRole)("student"), async (req, res) => {
    const { status } = req.body;
    if (!status || !["accepted", "declined"].includes(status)) {
        return res.status(400).json({ error: "status must be 'accepted' or 'declined'" });
    }
    const { data, error } = await supabase_1.supabaseAdmin
        .from("volunteer_requests")
        .update({ status })
        .eq("id", req.params.id)
        .eq("student_id", req.userId)
        .select("id, status")
        .single();
    if (error || !data) {
        return res.status(404).json({ error: "Request not found" });
    }
    return res.json({ request: data });
});
exports.default = router;
