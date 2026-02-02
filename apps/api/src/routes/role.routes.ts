import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { isOwnerOrAdmin } from "../middleware/authorize";
import * as roleService from "../services/role.service";

const router = Router();

// Validation schemas
const roleSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
});

const bulkRolesSchema = z.object({
  roles: z.array(roleSchema).min(1, "At least one role is required"),
});

/**
 * GET /api/v1/tenant/roles
 * Get all roles for the current tenant
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const roles = await roleService.getRoles(tenantId);
    res.json(roles);
  } catch (error: any) {
    console.error("Failed to get roles:", error);
    res.status(500).json({ error: "Failed to retrieve roles" });
  }
});

/**
 * POST /api/v1/tenant/roles
 * Add a new role (OWNER/ADMIN only)
 */
router.post("/", authenticate, isOwnerOrAdmin, async (req, res) => {
  try {
    const validation = roleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const tenantId = req.user!.tenantId;
    const { name, color } = validation.data;

    // Check for duplicate role name
    const existingRoles = await roleService.getRoles(tenantId);
    if (
      existingRoles.some(
        (r: { name: string; color: string }) => r.name === name,
      )
    ) {
      return res.status(400).json({
        error: "A role with this name already exists",
      });
    }

    const updatedRoles = await roleService.addRole(tenantId, { name, color });
    res.status(201).json(updatedRoles);
  } catch (error: any) {
    console.error("Failed to add role:", error);
    res.status(500).json({ error: "Failed to add role" });
  }
});

/**
 * PUT /api/v1/tenant/roles
 * Bulk update roles (for reordering or multiple edits) - OWNER/ADMIN only
 */
router.put("/", authenticate, isOwnerOrAdmin, async (req, res) => {
  try {
    const validation = bulkRolesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const tenantId = req.user!.tenantId;
    const { roles } = validation.data;

    // Check for duplicate role names
    const roleNames = roles.map((r) => r.name);
    const uniqueNames = new Set(roleNames);
    if (roleNames.length !== uniqueNames.size) {
      return res.status(400).json({
        error: "Duplicate role names are not allowed",
      });
    }

    const updatedRoles = await roleService.updateRoles(tenantId, roles);
    res.json(updatedRoles);
  } catch (error: any) {
    console.error("Failed to update roles:", error);
    res.status(500).json({ error: "Failed to update roles" });
  }
});

/**
 * PUT /api/v1/tenant/roles/:name
 * Edit a specific role - OWNER/ADMIN only
 */
router.put("/:name", authenticate, isOwnerOrAdmin, async (req, res) => {
  try {
    const currentName = decodeURIComponent(req.params.name);
    const validation = roleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const tenantId = req.user!.tenantId;
    const { name: newName, color } = validation.data;

    // Check if renaming to a different name that already exists
    if (currentName !== newName) {
      const existingRoles = await roleService.getRoles(tenantId);
      if (
        existingRoles.some(
          (r: { name: string; color: string }) => r.name === newName,
        )
      ) {
        return res.status(400).json({
          error: "A role with this name already exists",
        });
      }
    }

    const updatedRoles = await roleService.updateRole(tenantId, currentName, {
      name: newName,
      color,
    });

    if (!updatedRoles) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json(updatedRoles);
  } catch (error: any) {
    console.error("Failed to update role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

/**
 * DELETE /api/v1/tenant/roles/:name
 * Delete a role - OWNER/ADMIN only
 * Query param: reassignTo (optional) - role name to reassign shifts to
 */
router.delete("/:name", authenticate, isOwnerOrAdmin, async (req, res) => {
  try {
    const roleName = decodeURIComponent(req.params.name);
    const reassignTo = req.query.reassignTo as string | undefined;
    const tenantId = req.user!.tenantId;

    // Check if role exists
    const existingRoles = await roleService.getRoles(tenantId);
    if (
      !existingRoles.some(
        (r: { name: string; color: string }) => r.name === roleName,
      )
    ) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check if it's the last role
    if (existingRoles.length === 1) {
      return res.status(400).json({
        error: "Cannot delete the last role. At least one role must exist.",
      });
    }

    // Check if role is used in shifts
    const usage = await roleService.getRoleUsage(tenantId, roleName);
    if (usage.count > 0 && !reassignTo) {
      return res.status(400).json({
        error: `This role is used in ${usage.count} shift(s). Please provide a 'reassignTo' role name.`,
        usage,
      });
    }

    // Verify reassignTo role exists
    if (
      reassignTo &&
      !existingRoles.some(
        (r: { name: string; color: string }) => r.name === reassignTo,
      )
    ) {
      return res.status(400).json({
        error: `Reassign target role '${reassignTo}' does not exist`,
      });
    }

    const updatedRoles = await roleService.deleteRole(
      tenantId,
      roleName,
      reassignTo,
    );
    res.json({
      message: "Role deleted successfully",
      roles: updatedRoles,
      shiftsReassigned: usage.count,
    });
  } catch (error: any) {
    console.error("Failed to delete role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

/**
 * GET /api/v1/tenant/roles/:name/usage
 * Check how many shifts use this role
 */
router.get("/:name/usage", authenticate, async (req, res) => {
  try {
    const roleName = decodeURIComponent(req.params.name);
    const tenantId = req.user!.tenantId;

    const usage = await roleService.getRoleUsage(tenantId, roleName);
    res.json(usage);
  } catch (error: any) {
    console.error("Failed to get role usage:", error);
    res.status(500).json({ error: "Failed to get role usage" });
  }
});

/**
 * POST /api/v1/tenant/roles/reset
 * Reset roles to defaults - OWNER/ADMIN only
 * WARNING: This will reassign ALL existing shifts to default roles
 */
router.post("/reset", authenticate, isOwnerOrAdmin, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get current shift count to inform user
    const totalShifts = await roleService.getTotalShiftCount(tenantId);

    const resetRoles = await roleService.resetToDefaultRoles(tenantId);

    res.json({
      message: "Roles reset to defaults successfully",
      roles: resetRoles,
      shiftsAffected: totalShifts,
      warning:
        "All existing shifts have been reassigned to default roles based on best match",
    });
  } catch (error: any) {
    console.error("Failed to reset roles:", error);
    res.status(500).json({ error: "Failed to reset roles" });
  }
});

export default router;
