import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { authenticate } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import employeeRoutes from "./routes/employee.routes";
import scheduleRoutes from "./routes/schedule.routes";
import shiftSwapRoutes from "./routes/shift-swap.routes";
import tenantRoutes from "./routes/tenant.routes";
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

// Protected routes (require authentication)
app.use("/api/v1/employees", authenticate, employeeRoutes);
app.use("/api/v1/schedule", authenticate, scheduleRoutes);
app.use("/api/v1/schedule", authenticate, shiftSwapRoutes);
app.use("/api/v1/tenant", authenticate, tenantRoutes);
app.use("/api/v1/tenant/roles", authenticate, roleRoutes);
app.use("/api/v1/users", authenticate, userRoutes);
app.use("/api/v1/time-entries", authenticate, timeEntryRoutes);
app.use("/api/v1/locations", authenticate, locationRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Torre Tempo API listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
