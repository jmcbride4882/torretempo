import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Validation schema for OneSignal player ID update
const updatePlayerIdSchema = z.object({
  playerId: z.string().min(1).max(255),
});

/**
 * PATCH /users/me/onesignal-player-id
 * Update current user's OneSignal player ID for push notifications
 */
router.patch("/me/onesignal-player-id", async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Validate request body
    const { playerId } = updatePlayerIdSchema.parse(req.body);

    // Update user's OneSignal player ID
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { oneSignalPlayerId: playerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        oneSignalPlayerId: true,
      },
    });

    logger.info({ userId, playerId }, "Updated OneSignal player ID for user");

    res.json({
      success: true,
      message: "Player ID updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error(
      { error, userId: (req as any).user?.userId },
      "Failed to update player ID",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /users/me/onesignal-player-id
 * Remove current user's OneSignal player ID (unsubscribe from notifications)
 */
router.delete("/me/onesignal-player-id", async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Remove user's OneSignal player ID
    await prisma.user.update({
      where: { id: userId },
      data: { oneSignalPlayerId: null },
    });

    logger.info({ userId }, "Removed OneSignal player ID for user");

    res.json({
      success: true,
      message: "Player ID removed successfully",
    });
  } catch (error) {
    logger.error(
      { error, userId: (req as any).user?.userId },
      "Failed to remove player ID",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
