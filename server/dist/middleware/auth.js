"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const backend_1 = require("@clerk/backend");
const supabase_1 = require("../lib/supabase");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = authHeader.slice(7);
    let clerkId;
    try {
        const payload = await (0, backend_1.verifyToken)(token, { secretKey: process.env.CLERK_SECRET_KEY });
        clerkId = payload.sub;
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
    // Look up the DB profile by clerk_id to get the UUID primary key and role
    const { data: profile, error } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .select("id, role")
        .eq("clerk_id", clerkId)
        .single();
    if (error || !profile) {
        return res.status(403).json({ error: "Account not set up. Please complete registration." });
    }
    if (!profile.role) {
        return res.status(403).json({ error: "No role assigned to this account" });
    }
    req.userId = profile.id; // UUID — all existing routes stay unchanged
    req.userRole = profile.role;
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
