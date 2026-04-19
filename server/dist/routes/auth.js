"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backend_1 = require("@clerk/backend");
const clerk_1 = require("../lib/clerk");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// POST /api/auth/sync
// Called by the client after Clerk signup/login to create the user_profiles row.
// Does NOT use requireAuth middleware because the profile may not exist yet.
router.post("/sync", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
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
    const { role, full_name } = req.body;
    if (!role || !full_name) {
        return res.status(400).json({ error: "role and full_name are required" });
    }
    const validRoles = ["student", "educator", "client", "employer"];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }
    // Upsert profile (handles both first-time signup and re-syncs)
    const { error: upsertError } = await supabase_1.supabaseAdmin
        .from("user_profiles")
        .upsert({ clerk_id: clerkId, full_name, role }, { onConflict: "clerk_id" });
    if (upsertError) {
        return res.status(500).json({ error: upsertError.message });
    }
    // Set role in Clerk publicMetadata so the frontend can read it
    await clerk_1.clerkClient.users.updateUserMetadata(clerkId, {
        publicMetadata: { role },
    });
    return res.status(200).json({ ok: true });
});
exports.default = router;
