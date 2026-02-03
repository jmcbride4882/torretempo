import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authorize } from "../middleware/authorize";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authorize("owner", "admin", "manager", "employee"));

/**
 * GET /locations
 * Get all unique locations from tenant's schedules and shifts
 */
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    // Get unique locations from schedules
    const scheduleLocations = await prisma.schedule.findMany({
      where: {
        tenantId,
        location: { not: null },
        deletedAt: null,
      },
      select: { location: true },
      distinct: ["location"],
    });

    // Get unique locations from shifts
    const shiftLocations = await prisma.shift.findMany({
      where: {
        tenantId,
        location: { not: null },
        deletedAt: null,
      },
      select: { location: true },
      distinct: ["location"],
    });

    // Combine and deduplicate
    const allLocations = new Set<string>();

    scheduleLocations.forEach((s) => {
      if (s.location) allLocations.add(s.location);
    });

    shiftLocations.forEach((s) => {
      if (s.location) allLocations.add(s.location);
    });

    // Convert to sorted array
    const locations = Array.from(allLocations).sort();

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch tenant locations");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
