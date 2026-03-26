import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/profile
router.get("/", async (req: AuthRequest, res: Response) => {
  const { data: profile, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, phone, institution_id, created_at, institutions(name)")
    .eq("id", req.userId!)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ profile: { ...profile, role: req.userRole } });
});

// PATCH /api/profile
router.patch("/", async (req: AuthRequest, res: Response) => {
  const { full_name, phone } = req.body;

  if (!full_name && phone === undefined) {
    return res.status(400).json({ error: "Provide at least one field to update (full_name, phone)" });
  }

  const updates: Record<string, string> = {};
  if (full_name) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update(updates)
    .eq("id", req.userId!)
    .select("id, full_name, phone, institution_id, created_at")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ profile: { ...data, role: req.userRole } });
});

export default router;
