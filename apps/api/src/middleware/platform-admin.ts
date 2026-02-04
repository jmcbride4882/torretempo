import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Platform Admin Middleware
 *
 * SECURITY: God-mode middleware for platform administrators
 * - Enforces PLATFORM_ADMIN role (case-insensitive)
 * - Replaces tenant context for cross-tenant operations
 * - Used on /api/v1/platform/* routes ONLY
 *
 * MUST be used AFTER authenticate middleware
 */
export function platformAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    // Check if user is platform admin (case-insensitive)
    if (user.role?.toLowerCase() !== "platform_admin") {
      logger.warn(
        { userId: user.userId, role: user.role, path: req.path },
        "Platform admin access denied - insufficient permissions",
      );

      res.status(403).json({
        error: "Forbidden",
        message: "Platform admin access required",
      });
      return;
    }

    logger.debug(
      { userId: user.userId, role: user.role, path: req.path },
      "Platform admin access granted (god mode)",
    );

    next();
  } catch (error) {
    logger.error({ error }, "Platform admin middleware error");
    res.status(500).json({ error: "Internal server error" });
  }
}
