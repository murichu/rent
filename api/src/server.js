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

dotenv.config();

const app = express();

// Logging middleware
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
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
  console.log(`🚀 API listening on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
});
