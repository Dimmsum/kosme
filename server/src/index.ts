import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import waitlistRouter from "./routes/waitlist";
import clientSignupRouter from "./routes/client-signup";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import servicesRouter from "./routes/services";
import confirmationsRouter from "./routes/confirmations";
import verificationsRouter from "./routes/verifications";
import portfolioRouter from "./routes/portfolio";
import shortlistRouter from "./routes/shortlist";
import dashboardRouter from "./routes/dashboard";
import volunteerRequestsRouter from "./routes/volunteer-requests";
import { requireAuth } from "./middleware/auth";
import { supabaseAdmin } from "./lib/supabase";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Health-check routes registered before CORS/rate-limit middleware so
// server-to-server monitors (no Origin header) can reach them.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "kosmee-api",
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/keep-alive", async (_req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from("roles")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    res.json({ status: "ok", db: "reachable", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

const defaultOrigins = [
  "http://localhost:3000",
  "https://kosme.vercel.app",
  "https://www.kosme.vercel.app",
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const allowedOrigins = [...defaultOrigins, ...envOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Block requests with no Origin header (non-browser clients aren't expected in production)
      if (!origin) return callback(new Error("Not allowed by CORS"));

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow Vercel preview deployments for this project (kosme-* pattern)
      if (/^https:\/\/kosme-[a-z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));

// Global rate limit — applied to all routes
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

// Limit for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Upload limit reached, please try again later." },
});

app.use(globalLimiter);

// Public routes
app.use("/api/waitlist", waitlistRouter);
app.use("/api/client-signup", clientSignupRouter);
app.use("/api/auth", authLimiter, authRouter);

// Protected routes — all require a valid Clerk JWT
app.use("/api/profile", requireAuth, profileRouter);
app.use("/api/services/:id/photos", requireAuth, uploadLimiter, servicesRouter);
app.use("/api/services", requireAuth, servicesRouter);
app.use("/api/confirmations", requireAuth, confirmationsRouter);
app.use("/api/verifications", requireAuth, verificationsRouter);
app.use("/api/portfolio", requireAuth, portfolioRouter);
app.use("/api/shortlist", requireAuth, shortlistRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/volunteer-requests", requireAuth, volunteerRequestsRouter);

app.listen(PORT, () => {
  console.log(`Kosmee API running on http://localhost:${PORT}`);
});

export default app;
