"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const WAITLIST_FILE = path_1.default.join(__dirname, "../../data/waitlist.json");
router.post("/", async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || typeof email !== "string" || !email.includes("@")) {
            return res.status(400).json({ error: "Invalid email" });
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
