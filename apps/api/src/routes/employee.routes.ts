import { Router } from "express";
import { z } from "zod";
import { EmployeeService } from "../services/employee.service";
import { isAdminOrManager } from "../middleware/authorize";
import { logger } from "../utils/logger";

const router = Router();
const employeeService = new EmployeeService();

// Validation schemas
const createEmployeeSchema = z.object({
  // User fields
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "manager", "employee"]).optional(),
  
  // Employee fields
  nationalId: z.string().min(1),
  socialSecurity: z.string().min(1),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  employeeNumber: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  position: z.string().optional(),
  contractType: z.enum(["indefinido", "temporal", "practicas", "formacion"]),
  hireDate: z.string().datetime(),
  workSchedule: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  position: z.string().optional(),
  contractType: z
    .enum(["indefinido", "temporal", "practicas", "formacion"])
    .optional(),
  workSchedule: z.string().optional(),
  status: z.enum(["active", "on_leave", "terminated"]).optional(),
});

// GET /employees - Get all employees (filtered by role)
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const user = (req as any).user;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    // Pass user info for role-based filtering
    const employees = await employeeService.getAll(tenantId, user?.userId, user?.role);

    res.json({ success: true, data: employees });
  } catch (error) {
    logger.error({ error }, "Failed to fetch employees");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /employees/:id - Get employee by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const employee = await employeeService.getById(id, tenantId);

    res.json({ success: true, data: employee });
  } catch (error) {
    if (error instanceof Error && error.message === "Employee not found") {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    logger.error({ error }, "Failed to fetch employee");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /employees - Create employee (with user) - Admin/Manager only
router.post("/", isAdminOrManager, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = createEmployeeSchema.parse(req.body);

    // Convert hireDate string to Date object
    const input = {
      ...validatedInput,
      hireDate: new Date(validatedInput.hireDate),
    };

    const employee = await employeeService.create(input, tenantId);

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to create employee");
      res.status(400).json({
        error: "Failed to create employee",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to create employee");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /employees/:id - Update employee - Admin/Manager only
router.put("/:id", isAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const input = updateEmployeeSchema.parse(req.body);

    const employee = await employeeService.update(id, input, tenantId);

    res.json({ success: true, data: employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Employee not found") {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to update employee");
      res.status(400).json({
        error: "Failed to update employee",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to update employee");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /employees/:id - Delete employee (soft delete) - Admin/Manager only
router.delete("/:id", isAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const result = await employeeService.delete(id, tenantId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Employee not found") {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    logger.error({ error }, "Failed to delete employee");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
