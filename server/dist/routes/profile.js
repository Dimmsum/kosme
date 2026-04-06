"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// GET /api/profile
router.get("/", async (req, res) => {
    const { data: profile, error } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, phone, institution_id, created_at, institutions(name)")
        .eq("id", req.userId)
        .single();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json({ profile: { ...profile, role: req.userRole } });
});
// PATCH /api/profile
router.patch("/", async (req, res) => {
    const { full_name, phone } = req.body;
    if (!full_name && phone === undefined) {
        return res.status(400).json({ error: "Provide at least one field to update (full_name, phone)" });
    }
    const updates = {};
    if (full_name)
        updates.full_name = full_name;
    if (phone !== undefined)
        updates.phone = phone;
    const { data, error } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .update(updates)
        .eq("id", req.userId)
        .select("id, full_name, phone, institution_id, created_at")
        .single();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json({ profile: { ...data, role: req.userRole } });
});
exports.default = router;
