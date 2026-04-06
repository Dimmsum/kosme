"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const supabase_1 = require("../lib/supabase");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = authHeader.slice(7);
    const { data, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.userId = data.user.id;
    // Fetch the authoritative role from user_profiles (merged in migration 0005)
    const { data: profileRow, error: roleError } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
    if (roleError || !profileRow?.role) {
        return res.status(403).json({ error: "No role assigned to this account" });
    }
    req.userRole = profileRow.role;
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ error: "Forbidden: insufficient role" });
        }
        next();
    };
}
