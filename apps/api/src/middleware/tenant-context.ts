import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        legalName: string;
        settings: any;
      };
      tenantId?: string | null;
    }
  }
}

export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract tenant slug from URL params (set by Express route: /t/:tenantSlug/...)
    const tenantSlug = req.params.tenantSlug;

    if (!tenantSlug) {
      res.status(400).json({
        error: "Tenant slug required in path",
        message: "URL must be in format: /t/{tenantSlug}/...",
      });
      return;
    }

    // Fetch tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        legalName: true,
        settings: true,
        subscriptionStatus: true,
      },
    });

    if (!tenant) {
      res.status(404).json({
        error: "Tenant not found",
        message: `Tenant '${tenantSlug}' does not exist`,
      });
      return;
    }

    // Check if tenant is active
    if (
      tenant.subscriptionStatus !== "active" &&
      tenant.subscriptionStatus !== "trial"
    ) {
      res.status(403).json({
        error: "Tenant suspended",
        message: "This tenant account is not active",
      });
      return;
    }

    // Inject tenant context into request
    req.tenant = tenant;
    req.tenantId = tenant.id;

    logger.debug(
      { tenantId: tenant.id, slug: tenant.slug },
      "Tenant context resolved",
    );

    next();
  } catch (error) {
    logger.error({ error }, "Failed to resolve tenant context");
    res.status(500).json({ error: "Internal server error" });
  }
}
