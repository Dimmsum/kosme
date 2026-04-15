import { Router, Response } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase";
import { AuthRequest, requireRole } from "../middleware/auth";

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
  async (_req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name")
      .eq("role", "client")
      .order("full_name");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ clients: data ?? [] });
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
      id, name, category_id, notes, status, created_at, updated_at,
      client:client_id ( id, full_name )
    `,
      )
      .eq("student_id", req.userId!)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ services: data });
  },
);

// POST /api/services — student logs a new service
router.post(
  "/",
  requireRole("student"),
  async (req: AuthRequest, res: Response) => {
    const { name, category_id, client_id, notes } = req.body;

    if (!name || !category_id) {
      return res
        .status(400)
        .json({ error: "name and category_id are required" });
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
        return res
          .status(500)
          .json({ error: `Upload failed: ${uploadError.message}` });
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
      return res.status(500).json({ error: dbError.message });
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
      id, name, category_id, notes, status, created_at, updated_at,
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

  // Access check: student owner, assigned client, or educator/employer
  const student = Array.isArray(data.student) ? data.student[0] : data.student;
  const client = Array.isArray(data.client) ? data.client[0] : data.client;
  const isOwner = (student as { id: string } | null)?.id === req.userId;
  const isClient = (client as { id: string } | null)?.id === req.userId;
  const isPrivileged = ["educator", "employer"].includes(req.userRole ?? "");

  if (!isOwner && !isClient && !isPrivileged) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json({ service: data });
});

export default router;
