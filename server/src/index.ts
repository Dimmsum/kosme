import express from "express";
import cors from "cors";
import waitlistRouter from "./routes/waitlist";

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  "http://localhost:3000",
  "https://kosmee.com",
  "https://www.kosmee.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "kosmee-api", timestamp: new Date().toISOString() });
});

app.use("/api/waitlist", waitlistRouter);

app.listen(PORT, () => {
  console.log(`Kosmee API running on http://localhost:${PORT}`);
});

export default app;
