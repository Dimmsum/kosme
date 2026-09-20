import { Router, Response } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// GET /api/services/clients — list volunteer clients for the new-service form (student only)
router.get(
  "/clients",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    // Demo students only see demo volunteer clients (and vice versa) — keeps
    // a real person's name from ever showing up as a selectable "client" on
    // a public demo account, and keeps demo filler out of real students' lists.
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name")
      .eq("role", "client")
      .eq("is_demo", req.isDemo ?? false)
      .order("full_name");

    if (error) {
      console.error("services GET clients error:", error);
      return res.status(500).json({ error: "Failed to fetch clients" });
    }

    return res.json({ clients: data ?? [] });
  },
);

// GET /api/services/service-types — service catalog (types + recommended durations)
// for the log form. Returns every type; the client filters by the selected
// category. Not demo-scoped: the catalog is shared config, not per-account data.
router.get(
  "/service-types",
  requireRole("student"),
  async (_req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("service_types")
      .select(
        "id, category_id, name, recommended_duration_min, recommended_duration_max",
      )
      .order("name");

    if (error) {
      console.error("services GET service-types error:", error);
      return res.status(500).json({ error: "Failed to fetch service types" });
    }

    return res.json({ serviceTypes: data ?? [] });
  },
);

// GET /api/services — student's own services
router.get(
  "/",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("services")
      .select(
        `
      id, name, category_id, service_type_id, notes, status, created_at, updated_at,
      started_at, ended_at, actual_duration_min, duration_tag,
      client:client_id ( id, full_name )
    `,
      )
      .eq("student_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("services GET error:", error);
      return res.status(500).json({ error: "Failed to fetch services" });
    }

    return res.json({ services: data });
  },
);

// POST /api/services — student logs a new service
router.post(
  "/",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { name, category_id, service_type_id, client_id, notes, start_now } =
      req.body;

    if (!name || !category_id) {
      return res.status(400).json({ error: "name and category_id are required" });
    }

    if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
      return res.status(400).json({ error: "name must be between 1 and 255 characters" });
    }
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== "string" || notes.length > 2000) {
        return res.status(400).json({ error: "notes must be at most 2000 characters" });
      }
    }
    // category_id is a TEXT lookup key (e.g. "Haircuts"), not a UUID.
    if (typeof category_id !== "string" || category_id.length > 255) {
      return res.status(400).json({ error: "Invalid category_id" });
    }
    if (service_type_id != null && !isUuid(service_type_id)) {
      return res.status(400).json({ error: "Invalid service_type_id format" });
    }
    if (client_id && !isUuid(client_id)) {
      return res.status(400).json({ error: "Invalid client_id format" });
    }

    // start_now begins the timer immediately: the service opens in 'in_progress'
    // and is only routed to a client/educator once the student stops it. Without
    // it, the current instant-log behaviour is preserved.
    const timing = start_now === true;
    const status = timing
      ? "in_progress"
      : client_id
        ? "awaiting_client"
        : "awaiting_educator";

    const { data, error } = await supabaseAdmin
      .from("services")
      .insert({
        student_id: req.userId!,
        name: name.trim(),
        category_id,
        service_type_id: service_type_id ?? null,
        client_id: client_id ?? null,
        notes: notes ?? null,
        status,
        started_at: timing ? new Date().toISOString() : null,
      })
      .select(
        "id, name, category_id, service_type_id, client_id, notes, status, started_at, created_at",
      )
      .single();

    if (error) {
      console.error("services POST error:", error);
      return res.status(500).json({ error: "Failed to create service" });
    }

    return res.status(201).json({ service: data });
  },
);

// POST /api/services/:id/start — (re)start the timer on an owned service.
// Server-authoritative: started_at is (re)set to now and status moves to
// 'in_progress' so a running service survives a refresh or device switch.
router.post(
  "/:id/start",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    // Once submitted/verified the timer is done — don't let it be reopened.
    if (["verified", "rejected"].includes(service.status)) {
      return res
        .status(400)
        .json({ error: "This service can no longer be timed" });
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
        ended_at: null,
        actual_duration_min: null,
        duration_tag: null,
      })
      .eq("id", req.params.id)
      .select("id, status, started_at")
      .single();

    if (error) {
      console.error("services start error:", error);
      return res.status(500).json({ error: "Failed to start service" });
    }

    return res.json({ service: data });
  },
);

// POST /api/services/:id/stop — stop the timer, compute actual_duration_min and
// tag it under|within|over vs. the service_type's recommended range, then route
// the service on to the client (if any) or straight to the educator.
router.post(
  "/:id/stop",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status, started_at, client_id, service_type_id")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "in_progress" || !service.started_at) {
      return res
        .status(400)
        .json({ error: "Service is not currently running" });
    }

    const endedAt = new Date();
    const actualDurationMin = Math.max(
      0,
      Math.round((endedAt.getTime() - new Date(service.started_at).getTime()) / 60000),
    );

    // Tag against the recommended range from the chosen service_type, if any.
    let durationTag: "under" | "within" | "over" | null = null;
    if (service.service_type_id) {
      const { data: type } = await supabaseAdmin
        .from("service_types")
        .select("recommended_duration_min, recommended_duration_max")
        .eq("id", service.service_type_id)
        .single();
      const min = type?.recommended_duration_min ?? null;
      const max = type?.recommended_duration_max ?? null;
      if (min != null && actualDurationMin < min) durationTag = "under";
      else if (max != null && actualDurationMin > max) durationTag = "over";
      else if (min != null || max != null) durationTag = "within";
    }

    const nextStatus = service.client_id ? "awaiting_client" : "awaiting_educator";

    const { data, error } = await supabaseAdmin
      .from("services")
      .update({
        status: nextStatus,
        ended_at: endedAt.toISOString(),
        actual_duration_min: actualDurationMin,
        duration_tag: durationTag,
      })
      .eq("id", req.params.id)
      .select(
        "id, status, started_at, ended_at, actual_duration_min, duration_tag",
      )
      .single();

    if (error) {
      console.error("services stop error:", error);
      return res.status(500).json({ error: "Failed to stop service" });
    }

    return res.json({ service: data });
  },
);

// POST /api/services/:id/photos — upload before/after photos via server (bypasses storage RLS)
router.post(
  "/:id/photos",
  requireRole("student"),
  upload.fields([
    { name: "before", maxCount: 10 },
    { name: "after", maxCount: 10 },
    { name: "photos", maxCount: 20 },
  ]),
  async (req: AuthRequest, res: Response) => {
    // Verify the service belongs to this student
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (serviceError || !service) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Ensure bucket exists and is public (idempotent)
    const { error: bucketCreateError } =
      await supabaseAdmin.storage.createBucket("service-photos", {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
        ],
      });
    // If bucket already existed, force it public in case it was created private
    if (bucketCreateError) {
      await supabaseAdmin.storage.updateBucket("service-photos", {
        public: true,
      });
    }

    const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const beforeFiles = files["before"] ?? [];
    const afterFiles = files["after"] ?? [];
    const genericFiles = files["photos"] ?? [];

    if (
      beforeFiles.length === 0 &&
      afterFiles.length === 0 &&
      genericFiles.length === 0
    ) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const toUpload: {
      file: Express.Multer.File;
      type: "before" | "after";
      index: number;
    }[] = [
      ...beforeFiles.map((f, i) => ({
        file: f,
        type: "before" as const,
        index: i,
      })),
      ...afterFiles.map((f, i) => ({
        file: f,
        type: "after" as const,
        index: i,
      })),
      // Backward compatibility: older clients send `photos` without type.
      ...genericFiles.map((f, i) => ({
        file: f,
        type: "after" as const,
        index: i,
      })),
    ];

    const savedPhotos: { url: string; type: string }[] = [];

    for (const { file, type, index } of toUpload) {
      const ext = file.originalname.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${req.userId}/${req.params.id}/${type}-${index}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("service-photos")
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("photo upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload photo" });
      }

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("service-photos").getPublicUrl(path);

      savedPhotos.push({ url: publicUrl, type });
    }

    const { error: dbError } = await supabaseAdmin
      .from("service_photos")
      .insert(
        savedPhotos.map(({ url, type }) => ({
          service_id: req.params.id,
          url,
          type,
        })),
      );

    if (dbError) {
      console.error("service_photos insert error:", dbError);
      return res.status(500).json({ error: "Failed to save photo records" });
    }

    return res.status(201).json({ photos: savedPhotos });
  },
);

// GET /api/services/:id — single service detail (student owner, assigned educator, or client)
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(
      `
      id, name, category_id, service_type_id, notes, status, created_at, updated_at, is_demo,
      started_at, ended_at, actual_duration_min, duration_tag,
      student:student_id ( id, full_name ),
      client:client_id ( id, full_name ),
      service_photos ( id, type, url, created_at ),
      confirmations ( id, status, created_at ),
      verifications ( id, status, notes, created_at )
    `,
    )
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Service not found" });
  }

  // Access check: student owner, assigned client, or educator/employer —
  // and a demo account may only ever reach demo services, never real ones.
  const student = Array.isArray(data.student) ? data.student[0] : data.student;
  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const isOwner = (student as { id: string } | null)?.id === req.userId;
  const isClient = (client as { id: string } | null)?.id === req.userId;
  const isPrivileged = ["educator", "employer"].includes(req.userRole ?? "");
  const demoBoundaryOk = (data.is_demo ?? false) === (req.isDemo ?? false);

  if (!demoBoundaryOk || (!isOwner && !isClient && !isPrivileged)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json({ service: data });
});

export default router;
