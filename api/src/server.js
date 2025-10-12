import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { propertyRouter } from "./routes/properties.js";
import { tenantRouter } from "./routes/tenants.js";
import { leaseRouter } from "./routes/leases.js";
import { paymentRouter } from "./routes/payments.js";
import { agencyRouter } from "./routes/agencies.js";
import { usersRouter } from "./routes/users.js";
import { invoiceRouter } from "./routes/invoices.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { unitRouter } from "./routes/units.js";
import { noticeRouter } from "./routes/notices.js";
import { penaltyRouter } from "./routes/penalties.js";
import { ratingRouter } from "./routes/ratings.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimiter.js";
import logger, { morganStream } from "./utils/logger.js";

dotenv.config();

const app = express();

// Logging middleware with Winston
app.use(morgan(
  process.env.NODE_ENV === "production" 
    ? "combined" 
    : "dev",
  { stream: morganStream }
));

// Rate limiting
app.use('/api/', apiLimiter);

// CORS with more restrictive settings
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
});

// API v1 routes with versioning
const v1Router = express.Router();

// Apply auth rate limiter to auth routes
v1Router.use("/auth", authLimiter, authRouter);

// API routes
v1Router.use("/properties", propertyRouter);
v1Router.use("/tenants", tenantRouter);
v1Router.use("/leases", leaseRouter);
v1Router.use("/payments", paymentRouter);
v1Router.use("/agencies", agencyRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/invoices", invoiceRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/units", unitRouter);
v1Router.use("/notices", noticeRouter);
v1Router.use("/penalties", penaltyRouter);
v1Router.use("/ratings", ratingRouter);

// Mount v1 router
app.use("/api/v1", v1Router);

// Legacy routes (backward compatibility) - will be deprecated
app.use("/auth", authLimiter, authRouter);
app.use("/properties", propertyRouter);
app.use("/tenants", tenantRouter);
app.use("/leases", leaseRouter);
app.use("/payments", paymentRouter);
app.use("/agencies", agencyRouter);
app.use("/users", usersRouter);
app.use("/invoices", invoiceRouter);
app.use("/dashboard", dashboardRouter);
app.use("/units", unitRouter);
app.use("/notices", noticeRouter);
app.use("/penalties", penaltyRouter);
app.use("/ratings", ratingRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path
  });
});

// Global error handler (must be last)
app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  logger.info(`🚀 API listening on port ${port}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🔗 API v1: http://localhost:${port}/api/v1`);
});
