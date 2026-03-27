import "dotenv/config";
import express from "express";
import cors from "cors";
import waitlistRouter from "./routes/waitlist";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import servicesRouter from "./routes/services";
import confirmationsRouter from "./routes/confirmations";
import verificationsRouter from "./routes/verifications";
import portfolioRouter from "./routes/portfolio";
import shortlistRouter from "./routes/shortlist";
import dashboardRouter from "./routes/dashboard";
import { requireAuth } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Parse allowed origins from environment or use defaults
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
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);

      // Check exact match
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow all *.vercel.app domains in production
      if (origin.endsWith(".vercel.app")) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Public routes
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "kosmee-api",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/waitlist", waitlistRouter);
app.use("/api/auth", authRouter);

// Protected routes — all require a valid Supabase JWT
app.use("/api/profile", requireAuth, profileRouter);
app.use("/api/services", requireAuth, servicesRouter);
app.use("/api/confirmations", requireAuth, confirmationsRouter);
app.use("/api/verifications", requireAuth, verificationsRouter);
app.use("/api/portfolio", requireAuth, portfolioRouter);
app.use("/api/shortlist", requireAuth, shortlistRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);

app.listen(PORT, () => {
  console.log(`Kosmee API running on http://localhost:${PORT}`);
});

export default app;
