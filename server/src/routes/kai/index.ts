import { Router, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { AuthRequest } from "../../middleware/auth";

// Mounted at /api/kai (any authenticated role). KAI is assistive-only — it
// never verifies, grades, approves, rejects, or replaces educator judgement.
// Every route here is a stub gated on app_settings.kai_enabled until a real
// model is wired up (see docs/ISSUES.md KAI-1).
const router = Router();

async function kaiEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "kai_enabled")
    .single();
  return data?.value === true;
}

// POST /log-assist — stub for VER-3 reflection notes / missing-evidence prompts.
router.post("/log-assist", async (_req: AuthRequest, res: Response) => {
  if (!(await kaiEnabled())) {
    return res.status(503).json({ error: "KAI is not enabled" });
  }
  return res.json({ available: false, message: "KAI Log Assist is not yet available." });
});

// POST /portfolio-assist — stub for POR-3 caption/bio generation.
router.post("/portfolio-assist", async (_req: AuthRequest, res: Response) => {
  if (!(await kaiEnabled())) {
    return res.status(503).json({ error: "KAI is not enabled" });
  }
  return res.json({ available: false, message: "KAI Portfolio Assist is not yet available." });
});

export default router;
