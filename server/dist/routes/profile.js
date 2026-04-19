"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// GET /api/profile
router.get("/", async (req, res) => {
    const { data: profile, error } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, phone, institution_id, created_at, institutions(name)")
        .eq("id", req.userId)
        .single();
    if (error) {
        console.error("profile GET error:", error);
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
    return res.json({ profile: { ...profile, role: req.userRole } });
});
// PATCH /api/profile
router.patch("/", async (req, res) => {
    const { full_name, phone, institution_id } = req.body;
    if (!full_name && phone === undefined && institution_id === undefined) {
        return res.status(400).json({ error: "Provide at least one field to update (full_name, phone, institution_id)" });
    }
    // Validate lengths
    if (full_name !== undefined) {
        if (typeof full_name !== "string" || full_name.trim().length === 0 || full_name.length > 255) {
            return res.status(400).json({ error: "full_name must be between 1 and 255 characters" });
        }
    }
    if (phone !== undefined && phone !== null) {
        if (typeof phone !== "string" || phone.length > 20) {
            return res.status(400).json({ error: "phone must be a string up to 20 characters" });
        }
    }
    if (institution_id !== undefined && institution_id !== null) {
        if (!UUID_RE.test(institution_id)) {
            return res.status(400).json({ error: "Invalid institution_id format" });
        }
    }
    const updates = {};
    if (full_name !== undefined)
        updates.full_name = full_name.trim();
    if (phone !== undefined)
        updates.phone = phone;
    if (institution_id !== undefined)
        updates.institution_id = institution_id;
    const { data, error } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .update(updates)
        .eq("id", req.userId)
        .select("id, full_name, phone, institution_id, created_at")
        .single();
    if (error) {
        console.error("profile PATCH error:", error);
        return res.status(500).json({ error: "Failed to update profile" });
    }
    return res.json({ profile: { ...data, role: req.userRole } });
});
exports.default = router;
