import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { authenticate } from "./middleware/auth";
import { tenantContext } from "./middleware/tenant-context";
import { platformAdmin } from "./middleware/platform-admin";
import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employee.routes";
import scheduleRoutes from "./routes/schedule.routes";
import shiftSwapRoutes from "./routes/shift-swap.routes";
import tenantRoutes from "./routes/tenant.routes";
import platformTenantRoutes from "./routes/platform-tenant.routes";
import platformEmployeeRoutes from "./routes/platform-employee.routes";
import platformUserRoutes from "./routes/platform-user.routes";
import roleRoutes from "./routes/role.routes";
import userRoutes from "./routes/user.routes";
import timeEntryRoutes from "./routes/timeEntry.routes";
import locationRoutes from "./routes/location.routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (public - no authentication required for login)
app.use("/api/v1/auth", authRoutes);

// Platform admin routes (god-mode, no tenant context required)
// SECURITY: platformAdmin middleware enforces PLATFORM_ADMIN role
app.use(
  "/api/v1/platform/tenants",
  authenticate,
  platformAdmin,
  platformTenantRoutes,
);
app.use(
  "/api/v1/platform/employees",
  authenticate,
  platformAdmin,
  platformEmployeeRoutes,
);
app.use(
  "/api/v1/platform/users",
  authenticate,
  platformAdmin,
  platformUserRoutes,
);

// Protected routes (require authentication + tenant context)
app.use(
  "/api/v1/t/:tenantSlug/employees",
  authenticate,
  tenantContext,
  employeeRoutes,
);
app.use(
  "/api/v1/t/:tenantSlug/schedule",
  authenticate,
  tenantContext,
  scheduleRoutes,
);
app.use(
  "/api/v1/t/:tenantSlug/schedule",
  authenticate,
  tenantContext,
  shiftSwapRoutes,
);
app.use(
  "/api/v1/t/:tenantSlug/tenant",
  authenticate,
  tenantContext,
  tenantRoutes,
);
app.use(
  "/api/v1/t/:tenantSlug/tenant/roles",
  authenticate,
  tenantContext,
  roleRoutes,
);
app.use("/api/v1/t/:tenantSlug/users", authenticate, tenantContext, userRoutes);
app.use(
  "/api/v1/t/:tenantSlug/time-entries",
  authenticate,
  tenantContext,
  timeEntryRoutes,
);
app.use(
  "/api/v1/t/:tenantSlug/locations",
  authenticate,
  tenantContext,
  locationRoutes,
);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Torre Tempo API listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
