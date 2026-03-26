import { Router, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

// GET /api/services/clients — list volunteer clients for the new-service form (student only)
router.get("/clients", requireRole("student"), async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name")
    .eq("role", "client")
    .order("full_name");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ clients: data ?? [] });
});

// GET /api/services — student's own services
router.get("/", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, notes, status, created_at, updated_at,
      client:client_id ( id, full_name )
    `)
    .eq("student_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ services: data });
});

// POST /api/services — student logs a new service
router.post("/", requireRole("student"), async (req: AuthRequest, res: Response) => {
  const { name, category_id, client_id, notes } = req.body;

  if (!name || !category_id) {
    return res.status(400).json({ error: "name and category_id are required" });
  }

  // If no client supplied, jump straight to awaiting_educator
  const status = client_id ? "awaiting_client" : "awaiting_educator";

  const { data, error } = await supabaseAdmin
    .from("services")
    .insert({
      student_id: req.userId!,
      name,
      category_id,
      client_id: client_id ?? null,
      notes: notes ?? null,
      status,
    })
    .select("id, name, category_id, client_id, notes, status, created_at")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ service: data });
});

// GET /api/services/:id — single service detail (student owner, assigned educator, or client)
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(`
      id, name, category_id, notes, status, created_at, updated_at,
      student:student_id ( id, full_name ),
      client:client_id ( id, full_name ),
      service_photos ( id, type, url, created_at ),
      confirmations ( id, status, created_at ),
      verifications ( id, status, notes, created_at )
    `)
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Service not found" });
  }

  // Access check: student owner, assigned client, or educator/employer
  const isOwner = (data.student as { id: string }).id === req.userId;
  const isClient = (data.client as { id: string } | null)?.id === req.userId;
  const isPrivileged = ["educator", "employer"].includes(req.userRole ?? "");

  if (!isOwner && !isClient && !isPrivileged) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json({ service: data });
});

export default router;
