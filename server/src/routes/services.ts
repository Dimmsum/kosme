import { Router, Response } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";
import { isUuid } from "../lib/validation";
import { logEvent } from "../lib/events";

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

// Allowed values for services.client_source (migration 0019). Kept in sync
// with the CHECK constraint on the column.
const CLIENT_SOURCES = [
  "friend_family",
  "school_assigned",
  "walk_in_client_day",
  "salon_placement",
  "kosme_volunteer",
  "other",
] as const;
type ClientSource = (typeof CLIENT_SOURCES)[number];

const PHOTO_STAGES = ["before", "during", "after"] as const;
type PhotoStage = (typeof PHOTO_STAGES)[number];

function isPhotoStage(value: unknown): value is PhotoStage {
  return typeof value === "string" && (PHOTO_STAGES as readonly string[]).includes(value);
}

// Parses the `stages` form field (a JSON array of stage strings, one per file
// in the `photos` field, same order). Returns null if the caller didn't send
// stage tags at all (stage stays NULL on those rows); throws if they did send
// something but it doesn't validate, so the route can 400 instead of silently
// dropping a bad tag.
function parsePhotoStages(raw: unknown, count: number): (PhotoStage | null)[] {
  if (raw === undefined || raw === null) return new Array(count).fill(null);
  if (typeof raw !== "string") {
    throw new Error("stages must be a JSON array of strings");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("stages must be valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length !== count) {
    throw new Error(`stages must be an array of ${count} value(s) matching the photos field`);
  }
  return parsed.map((value) => {
    if (value === null || value === undefined) return null;
    if (!isPhotoStage(value)) {
      throw new Error(`Invalid stage "${String(value)}" — must be before, during, or after`);
    }
    return value;
  });
}

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
      id, name, category_id, service_type_id, client_source, notes, reflection_notes, status, created_at, updated_at,
      started_at, ended_at, actual_duration_min, adjusted_duration_min, duration_tag,
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
    const {
      name,
      category_id,
      service_type_id,
      client_id,
      client_source,
      notes,
      start_now,
      photo_consent,
    } = req.body;

    if (!name || !category_id) {
      return res.status(400).json({ error: "name and category_id are required" });
    }
    if (!client_source || !CLIENT_SOURCES.includes(client_source)) {
      return res.status(400).json({
        error: `client_source is required and must be one of: ${CLIENT_SOURCES.join(", ")}`,
      });
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
    if (typeof photo_consent !== "boolean") {
      return res.status(400).json({ error: "photo_consent must be true or false" });
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
        client_source: client_source as ClientSource,
        notes: notes ?? null,
        status,
        started_at: timing ? new Date().toISOString() : null,
      })
      .select(
        "id, name, category_id, service_type_id, client_id, client_source, notes, status, started_at, created_at",
      )
      .single();

    if (error) {
      console.error("services POST error:", error);
      return res.status(500).json({ error: "Failed to create service" });
    }

    // POR-2: record the client's photo consent against this service (CON-1's
    // `consent_records`, subject_type 'service') so portfolio reads can gate
    // photos regardless of client source. Non-fatal, same as client-signup.ts:
    // a missing row fails closed (photos hidden from the portfolio).
    const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
      subject_type: "service",
      subject_id: data.id,
      photo_consent,
    });
    if (consentError) {
      console.error("consent_records insert error:", consentError);
    }

    // Instant-log with no client skips confirmation and lands straight in the
    // educator queue (ALT-4).
    if (data.status === "awaiting_educator") {
      await logEvent(
        "priority",
        "ready_for_verification",
        req.userId!,
        data.id,
        `"${data.name}" is ready for verification.`,
      );
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
      .select("id, name, status")
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

    await logEvent(
      "activity",
      "service_started",
      req.userId!,
      service.id,
      `Started "${service.name}"`,
    );

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
      .select("id, name, status, started_at, client_id, service_type_id")
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

    await logEvent(
      "activity",
      "service_stopped",
      req.userId!,
      service.id,
      `Stopped "${service.name}" (${actualDurationMin} min)`,
    );

    // Priority alert for educators when the logged duration falls outside the
    // service type's recommended range.
    if (durationTag === "over" || durationTag === "under") {
      await logEvent(
        "priority",
        durationTag === "over" ? "duration_over" : "duration_under",
        req.userId!,
        service.id,
        `"${service.name}" ran ${durationTag} the recommended duration (${actualDurationMin} min).`,
      );
    }

    // No assigned client → straight into the educator queue (ALT-4).
    if (nextStatus === "awaiting_educator") {
      await logEvent(
        "priority",
        "ready_for_verification",
        req.userId!,
        service.id,
        `"${service.name}" is ready for verification.`,
      );
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

    // `stages` is an optional JSON array of "before"|"during"|"after" (or
    // null) values, one per file in the `photos` field, in the same order it
    // was appended client-side. Older/other callers that don't send it get
    // stage = null on those rows (nullable column — see migration 0020).
    let genericStages: (PhotoStage | null)[];
    try {
      genericStages = parsePhotoStages(req.body?.stages, genericFiles.length);
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : "Invalid stages value",
      });
    }

    const toUpload: {
      file: Express.Multer.File;
      type: "before" | "after";
      stage: PhotoStage | null;
      index: number;
    }[] = [
      // The `before`/`after` fields are a legacy upload path with no client
      // currently using them; default their stage from the field name itself
      // so any existing integration still gets a sensible tag for free.
      ...beforeFiles.map((f, i) => ({
        file: f,
        type: "before" as const,
        stage: "before" as PhotoStage,
        index: i,
      })),
      ...afterFiles.map((f, i) => ({
        file: f,
        type: "after" as const,
        stage: "after" as PhotoStage,
        index: i,
      })),
      // Backward compatibility: older clients send `photos` without type.
      ...genericFiles.map((f, i) => ({
        file: f,
        type: "after" as const,
        stage: genericStages[i] ?? null,
        index: i,
      })),
    ];

    const savedPhotos: { url: string; type: string; stage: PhotoStage | null }[] = [];

    for (const { file, type, stage, index } of toUpload) {
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

      savedPhotos.push({ url: publicUrl, type, stage });
    }

    const { error: dbError } = await supabaseAdmin
      .from("service_photos")
      .insert(
        savedPhotos.map(({ url, type, stage }) => ({
          service_id: req.params.id,
          url,
          type,
          stage,
        })),
      );

    if (dbError) {
      console.error("service_photos insert error:", dbError);
      return res.status(500).json({ error: "Failed to save photo records" });
    }

    return res.status(201).json({ photos: savedPhotos });
  },
);

// PATCH /api/services/:id — student updates their own reflection notes.
// Reflection is written after the service has happened, from the detail page
// — separate from `notes`, which is the service description set at log time.
// Locked once the service is verified, matching the "no further changes"
// messaging shown on the detail page for verified services.
router.patch(
  "/:id",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { reflection_notes } = req.body as { reflection_notes?: unknown };

    if (reflection_notes === undefined) {
      return res.status(400).json({ error: "reflection_notes is required" });
    }
    if (
      reflection_notes !== null &&
      (typeof reflection_notes !== "string" || reflection_notes.length > 2000)
    ) {
      return res
        .status(400)
        .json({ error: "reflection_notes must be at most 2000 characters" });
    }

    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, status")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status === "verified") {
      return res
        .status(400)
        .json({ error: "This service is verified and can no longer be edited" });
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .update({
        reflection_notes:
          typeof reflection_notes === "string"
            ? reflection_notes.trim() || null
            : null,
      })
      .eq("id", req.params.id)
      .select("id, reflection_notes")
      .single();

    if (error) {
      console.error("services PATCH error:", error);
      return res.status(500).json({ error: "Failed to update service" });
    }

    return res.json({ service: data });
  },
);

// PUT /api/services/:id/consent — student records or changes the client's
// portfolio photo consent after the fact (POR-2 follow-up). Services logged
// before POR-2 have no `consent_records` row, so their photos are hidden from
// the portfolio until one is written here. Allowed at any status, verified
// included: consent governs portfolio display, not the verification evidence.
router.put(
  "/:id/consent",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: "Invalid service id" });
    }
    const { photo_consent } = req.body as { photo_consent?: unknown };
    if (typeof photo_consent !== "boolean") {
      return res.status(400).json({ error: "photo_consent must be true or false" });
    }

    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const { data, error } = await supabaseAdmin
      .from("consent_records")
      .upsert(
        {
          subject_type: "service",
          subject_id: service.id,
          photo_consent,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "subject_type,subject_id" },
      )
      .select("photo_consent")
      .single();

    if (error || !data) {
      console.error("consent_records upsert error:", error);
      return res.status(500).json({ error: "Failed to save photo consent" });
    }

    return res.json({ photo_consent: data.photo_consent });
  },
);

// POST /api/services/:id/submit — explicit student action forwarding a
// client-confirmed service on to the educator review queue. Gated on the
// pre-submit checklist: the client must have confirmed, at least one evidence
// photo must be attached, and reflection notes must be present. Services with
// no assigned client route straight to awaiting_educator on stop (no pause
// point to gate) and aren't affected by this endpoint.
router.post(
  "/:id/submit",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, name, status, reflection_notes")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "awaiting_client") {
      return res.status(400).json({
        error: "This service is not ready to submit for verification",
      });
    }

    const [{ data: confirmation }, { count: photoCount }] = await Promise.all([
      supabaseAdmin
        .from("confirmations")
        .select("status")
        .eq("service_id", req.params.id)
        .maybeSingle(),
      supabaseAdmin
        .from("service_photos")
        .select("id", { count: "exact", head: true })
        .eq("service_id", req.params.id),
    ]);

    const missing: string[] = [];
    if (confirmation?.status !== "confirmed") missing.push("client confirmation");
    if (!photoCount) missing.push("at least one evidence photo");
    if (!service.reflection_notes || !service.reflection_notes.trim()) {
      missing.push("reflection notes");
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Cannot submit for verification — missing: ${missing.join(", ")}`,
        missing,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .update({ status: "awaiting_educator" })
      .eq("id", req.params.id)
      .select("id, status")
      .single();

    if (error) {
      console.error("services submit error:", error);
      return res
        .status(500)
        .json({ error: "Failed to submit service for verification" });
    }

    await logEvent(
      "priority",
      "ready_for_verification",
      req.userId!,
      service.id,
      `"${service.name}" is ready for verification.`,
    );

    return res.json({ service: data });
  },
);

// POST /api/services/:id/resubmit — student sends a corrections_requested
// service back to the educator queue after fixing it up. No checklist
// re-check (evidence/reflection/confirmation were already satisfied to reach
// awaiting_educator the first time) — this just reopens the review.
router.post(
  "/:id/resubmit",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { data: service, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, name, status")
      .eq("id", req.params.id)
      .eq("student_id", req.userId!)
      .single();

    if (svcErr || !service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.status !== "corrections_requested") {
      return res
        .status(400)
        .json({ error: "This service has no corrections pending" });
    }

    const { data, error } = await supabaseAdmin
      .from("services")
      .update({ status: "awaiting_educator" })
      .eq("id", req.params.id)
      .select("id, status")
      .single();

    if (error) {
      console.error("services resubmit error:", error);
      return res.status(500).json({ error: "Failed to resubmit service" });
    }

    await logEvent(
      "priority",
      "ready_for_verification",
      req.userId!,
      service.id,
      `"${service.name}" was resubmitted after corrections and is ready for verification.`,
    );

    return res.json({ service: data });
  },
);

// GET /api/services/:id — single service detail (student owner, assigned educator, or client)
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select(
      `
      id, name, category_id, service_type_id, client_source, notes, reflection_notes, status, created_at, updated_at, is_demo,
      started_at, ended_at, actual_duration_min, adjusted_duration_min, duration_tag,
      student:student_id ( id, full_name ),
      client:client_id ( id, full_name ),
      service_photos ( id, type, stage, url, created_at ),
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

  // Portfolio photo consent (POR-2). consent_records has no FK to services,
  // so it's looked up separately. null = no record (photos hidden from the
  // portfolio until the student records one via PUT /:id/consent).
  const { data: consent, error: consentError } = await supabaseAdmin
    .from("consent_records")
    .select("photo_consent")
    .eq("subject_type", "service")
    .eq("subject_id", data.id)
    .maybeSingle();
  if (consentError) {
    console.error("consent_records lookup error:", consentError);
  }

  return res.json({
    service: { ...data, photo_consent: consent?.photo_consent ?? null },
  });
});

export default router;
