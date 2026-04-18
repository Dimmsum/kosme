import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";
import { supabaseAdmin } from "../lib/supabase";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);

  let clerkId: string;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    clerkId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Look up the DB profile by clerk_id to get the UUID primary key and role
  const { data: profile, error } = await supabaseAdmin
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

  req.userId = profile.id;       // UUID — all existing routes stay unchanged
  req.userRole = profile.role;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}
