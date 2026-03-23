import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import path from "path";

const router = Router();

const WAITLIST_FILE = path.join(__dirname, "../../data/waitlist.json");

interface WaitlistEntry {
  email: string;
  role?: string;
  joinedAt: string;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email" });
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
