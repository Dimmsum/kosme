"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// POST /api/auth/register
router.post("/register", async (req, res) => {
    const { email, password, role, full_name } = req.body;
    if (!email || !password || !role || !full_name) {
        return res.status(400).json({ error: "email, password, role, and full_name are required" });
    }
    // Fetch valid roles from the database — no hardcoded list
    const { data: validRoles, error: rolesError } = await supabase_1.supabaseAdmin
        .from("roles")
        .select("id");
    if (rolesError) {
        return res.status(500).json({ error: "Could not fetch valid roles" });
    }
    const validRoleIds = (validRoles ?? []).map((r) => r.id);
    if (!validRoleIds.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoleIds.join(", ")}` });
    }
    const { data, error } = await supabase_1.supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role, full_name },
        },
    });
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({
        user: {
            id: data.user?.id,
            email: data.user?.email,
            role,
        },
        session: data.session,
    });
});
// POST /api/auth/login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
    }
    const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        return res.status(401).json({ error: error.message });
    }
    // Fetch the authoritative role from user_profiles (merged in migration 0005)
    const { data: profileRow } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
    return res.json({
        user: {
            id: data.user.id,
            email: data.user.email,
            role: profileRow?.role ?? null,
        },
        session: data.session,
    });
});
exports.default = router;
