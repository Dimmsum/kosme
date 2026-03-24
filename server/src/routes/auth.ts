import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

type Role = "student" | "educator" | "client" | "employer";

const VALID_ROLES: Role[] = ["student", "educator", "client", "employer"];

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, role, full_name } = req.body;

  if (!email || !password || !role || !full_name) {
    return res.status(400).json({ error: "email, password, role, and full_name are required" });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const { data, error } = await supabase.auth.signUp({
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
      role: data.user?.user_metadata?.role,
    },
    session: data.session,
  });
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role,
    },
    session: data.session,
  });
});

export default router;
