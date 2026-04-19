import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import rateLimit from "express-rate-limit";

const router = Router();

const WAITLIST_FILE = path.join(__dirname, "../../data/waitlist.json");

// RFC 5322-compatible email regex (simplified but robust)
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const VALID_ROLES = ["student", "educator", "client", "employer"];

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many waitlist submissions, please try again later." },
});

interface WaitlistEntry {
  email: string;
  role?: string;
  joinedAt: string;
}

router.post("/", waitlistLimiter, async (req: Request, res: Response) => {
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

    let entries: WaitlistEntry[] = [];
    try {
      const data = await fs.readFile(WAITLIST_FILE, "utf-8");
      entries = JSON.parse(data);
    } catch {
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
      await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
