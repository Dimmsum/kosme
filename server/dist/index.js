"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const waitlist_1 = __importDefault(require("./routes/waitlist"));
const auth_1 = __importDefault(require("./routes/auth"));
const profile_1 = __importDefault(require("./routes/profile"));
const services_1 = __importDefault(require("./routes/services"));
const confirmations_1 = __importDefault(require("./routes/confirmations"));
const verifications_1 = __importDefault(require("./routes/verifications"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const shortlist_1 = __importDefault(require("./routes/shortlist"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const volunteer_requests_1 = __importDefault(require("./routes/volunteer-requests"));
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, mobile apps)
        if (!origin)
            return callback(null, true);
        // Check exact match
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        // Allow Vercel preview deployments for this project
        if (/^https:\/\/kosme[a-z0-9-]*\.vercel\.app$/.test(origin))
            return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json());
// Public routes
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "kosmee-api",
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/waitlist", waitlist_1.default);
app.use("/api/auth", auth_1.default);
// Protected routes — all require a valid Supabase JWT
app.use("/api/profile", auth_2.requireAuth, profile_1.default);
app.use("/api/services", auth_2.requireAuth, services_1.default);
app.use("/api/confirmations", auth_2.requireAuth, confirmations_1.default);
app.use("/api/verifications", auth_2.requireAuth, verifications_1.default);
app.use("/api/portfolio", auth_2.requireAuth, portfolio_1.default);
app.use("/api/shortlist", auth_2.requireAuth, shortlist_1.default);
app.use("/api/dashboard", auth_2.requireAuth, dashboard_1.default);
app.use("/api/volunteer-requests", auth_2.requireAuth, volunteer_requests_1.default);
app.listen(PORT, () => {
    console.log(`Kosmee API running on http://localhost:${PORT}`);
});
exports.default = app;
