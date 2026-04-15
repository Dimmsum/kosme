"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/verifications/students — list all students with service stats (educator only)
router.get("/students", (0, auth_1.requireRole)("educator"), async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select(`
      id, full_name, institution_id, created_at,
      institutions ( name ),
      services!services_student_id_fkey ( id, status )
    `)
        .eq("role", "student")
        .order("full_name");
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    const students = data.map((p) => {
        const services = p.services ?? [];
        const verified = services.filter((s) => s.status === "verified");
        return {
            id: p.id,
            full_name: p.full_name,
            institution_id: p.institution_id,
            institution_name: p.institutions?.name ?? null,
            verified_count: verified.length,
            total_count: services.length,
        };
    });
    return res.json({ students });
});
// GET /api/verifications/students/:studentId — educator view of a student's service history
router.get("/students/:studentId", (0, auth_1.requireRole)("educator"), async (req, res) => {
    const { studentId } = req.params;
    const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, institution_id, institutions ( name )")
        .eq("id", studentId)
        .eq("role", "student")
        .single();
    if (profileError || !profile) {
        return res.status(404).json({ error: "Student not found" });
    }
    const { data: services, error: servicesError } = await supabase_1.supabaseAdmin
        .from("services")
        .select(`
      id, name, category_id, notes, status, created_at,
      client:client_id ( id, full_name ),
      verifications ( id, status, created_at, notes ),
      service_photos ( id, type, url )
    `)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
    if (servicesError) {
        return res.status(500).json({ error: servicesError.message });
    }
    return res.json({ student: profile, services: services ?? [] });
});
// GET /api/verifications/pending — services awaiting educator review
router.get("/pending", (0, auth_1.requireRole)("educator"), async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("services")
        .select(`
      id, name, category_id, notes, status, created_at,
      student:student_id ( id, full_name ),
      client:client_id ( id, full_name ),
      service_photos ( id, type, url )
    `)
        .eq("status", "awaiting_educator")
        .order("created_at", { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json({ pending: data });
});
// GET /api/verifications/history — services the educator has already verified or rejected
router.get("/history", (0, auth_1.requireRole)("educator"), async (req, res) => {
    const { data, error } = await supabase_1.supabaseAdmin
        .from("verifications")
        .select(`
      id, status, notes, created_at,
      service:service_id (
        id, name, category_id, notes, created_at,
        student:student_id ( id, full_name ),
        service_photos ( id, type, url )
      )
    `)
        .eq("educator_id", req.userId)
        .order("created_at", { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json({ history: data });
});
// POST /api/verifications/:serviceId/verify — educator verifies a service
router.post("/:serviceId/verify", (0, auth_1.requireRole)("educator"), async (req, res) => {
    const { serviceId } = req.params;
    const { notes } = req.body;
    const { data: service, error: svcErr } = await supabase_1.supabaseAdmin
        .from("services")
        .select("id, status")
        .eq("id", serviceId)
        .single();
    if (svcErr || !service) {
        return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "awaiting_educator") {
        return res
            .status(400)
            .json({ error: "Service is not awaiting educator verification" });
    }
    // Mark service verified
    const { error: updateErr } = await supabase_1.supabaseAdmin
        .from("services")
        .update({ status: "verified" })
        .eq("id", serviceId);
    if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
    }
    // Upsert verification record
    const { data: verification, error: verErr } = await supabase_1.supabaseAdmin
        .from("verifications")
        .upsert({
        service_id: serviceId,
        educator_id: req.userId,
        status: "verified",
        notes: notes ?? null,
    }, { onConflict: "service_id" })
        .select("id, status, notes, created_at")
        .single();
    if (verErr) {
        return res.status(500).json({ error: verErr.message });
    }
    return res.json({ verification });
});
// POST /api/verifications/:serviceId/reject — educator rejects a service
router.post("/:serviceId/reject", (0, auth_1.requireRole)("educator"), async (req, res) => {
    const { serviceId } = req.params;
    const { notes } = req.body;
    const { data: service, error: svcErr } = await supabase_1.supabaseAdmin
        .from("services")
        .select("id, status")
        .eq("id", serviceId)
        .single();
    if (svcErr || !service) {
        return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "awaiting_educator") {
        return res
            .status(400)
            .json({ error: "Service is not awaiting educator verification" });
    }
    // Mark service rejected
    const { error: updateErr } = await supabase_1.supabaseAdmin
        .from("services")
        .update({ status: "rejected" })
        .eq("id", serviceId);
    if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
    }
    // Upsert verification record as rejected
    const { data: verification, error: verErr } = await supabase_1.supabaseAdmin
        .from("verifications")
        .upsert({
        service_id: serviceId,
        educator_id: req.userId,
        status: "rejected",
        notes: notes ?? null,
    }, { onConflict: "service_id" })
        .select("id, status, notes, created_at")
        .single();
    if (verErr) {
        return res.status(500).json({ error: verErr.message });
    }
    return res.json({ verification });
});
exports.default = router;
