"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const WAITLIST_FILE = path_1.default.join(__dirname, "../../data/waitlist.json");
// RFC 5322-compatible email regex (simplified but robust)
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const VALID_ROLES = ["student", "educator", "client", "employer"];
const waitlistLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 signups per IP per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many waitlist submissions, please try again later." },
});
router.post("/", waitlistLimiter, async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
            return res.status(400).json({ error: "Invalid email address" });
        }
        if (email.length > 254) {
            return res.status(400).json({ error: "Email address too long" });
        }
        if (role !== undefined && !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }
        let entries = [];
        try {
            const data = await fs_1.promises.readFile(WAITLIST_FILE, "utf-8");
            entries = JSON.parse(data);
        }
        catch {
            // File doesn't exist yet — start fresh
        }
        const normalised = email.toLowerCase().trim();
        const alreadyExists = entries.some((e) => e.email === normalised);
        if (!alreadyExists) {
            entries.push({
                email: normalised,
                role: role ?? undefined,
                joinedAt: new Date().toISOString(),
            });
            await fs_1.promises.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
        }
        return res.json({ success: true });
    }
    catch {
        return res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
