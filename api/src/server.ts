import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.js";
import { propertyRouter } from "./routes/properties.js";
import { tenantRouter } from "./routes/tenants.js";
import { leaseRouter } from "./routes/leases.js";
import { paymentRouter } from "./routes/payments.js";
import { agencyRouter } from "./routes/agencies.js";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
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

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
