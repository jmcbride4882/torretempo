import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Authorization middleware - checks if user has required role
 * Must be used AFTER authenticate middleware
 *
 * NOTE: platform_admin role ALWAYS bypasses all authorization checks
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required",
        });
        return;
      }

      // Platform admin bypasses all role checks (god mode)
      // Case-insensitive check to handle PLATFORM_ADMIN vs platform_admin
      if (user.role?.toLowerCase() === "platform_admin") {
        logger.debug(
          { userId: user.userId, role: user.role },
          "Platform admin authorized (god mode)",
        );
        next();
        return;
      }

      // Case-insensitive role check
      const userRoleLower = user.role?.toLowerCase();
      const allowedRolesLower = allowedRoles.map((r) => r.toLowerCase());

      if (!allowedRolesLower.includes(userRoleLower)) {
        logger.warn(
          { userId: user.userId, role: user.role, allowedRoles },
          "Authorization failed - insufficient permissions",
        );

        res.status(403).json({
          error: "Forbidden",
          message: "Insufficient permissions",
        });
        return;
      }

      logger.debug({ userId: user.userId, role: user.role }, "User authorized");

      next();
    } catch (error) {
      logger.error({ error }, "Authorization error");
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Check if user is platform admin
 */
export function isPlatformAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  authorize("platform_admin")(req, res, next);
}

/**
 * Check if user is owner
 */
export function isOwner(req: Request, res: Response, next: NextFunction): void {
  authorize("owner")(req, res, next);
}

/**
 * Check if user is admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction): void {
  authorize("admin")(req, res, next);
}

/**
 * Check if user is owner or admin
 */
export function isOwnerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  authorize("owner", "admin")(req, res, next);
}

/**
 * Check if user is admin or manager
 */
export function isAdminOrManager(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  authorize("admin", "manager")(req, res, next);
}

/**
 * Check if user has staff-level access (owner, admin, or manager)
 */
export function isStaff(req: Request, res: Response, next: NextFunction): void {
  authorize("owner", "admin", "manager")(req, res, next);
}
