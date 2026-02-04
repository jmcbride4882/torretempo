import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { platformAdmin } from "../middleware/platform-admin";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Platform Employee Management Routes
 *
 * SECURITY: ALL routes protected by platformAdmin middleware
 * PLATFORM_ADMIN role ONLY - cross-tenant employee management
 *
 * These routes bypass tenant isolation for god-mode access across all tenants
 */

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

  // REQUIRED: tenantId for platform admin to specify which tenant
  tenantId: z.string().uuid(),
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

/**
 * GET /api/v1/platform/employees
 * List all employees across all tenants (PLATFORM_ADMIN only)
 *
 * Query params:
 * - tenantId: Optional filter by tenant
 * - page, perPage: Pagination
 * - search: Search by name, email, employee number
 *
 * SECURITY: platformAdmin middleware enforced
 */
router.get("/", platformAdmin, async (req, res) => {
  try {
    const { page = 1, perPage = 20, search, tenantId } = req.query;

    const skip = (Number(page) - 1) * Number(perPage);
    const take = Number(perPage);

    // Build filter - NO tenant isolation, this is god mode
    const where: any = { deletedAt: null };

    // Optional tenant filter
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { employeeNumber: { contains: String(search), mode: "insensitive" } },
        { position: { contains: String(search), mode: "insensitive" } },
        {
          user: {
            firstName: { contains: String(search), mode: "insensitive" },
          },
        },
        {
          user: { lastName: { contains: String(search), mode: "insensitive" } },
        },
        { user: { email: { contains: String(search), mode: "insensitive" } } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          tenant: {
            select: {
              id: true,
              slug: true,
              legalName: true,
            },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      success: true,
      data: employees,
      meta: { total, page: Number(page), perPage: Number(perPage) },
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        action: "platform_list_employees",
        total,
        tenantFilter: tenantId || "all",
      },
      "Platform admin listed employees",
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch employees (platform)");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/platform/employees/:id
 * Get single employee by ID (cross-tenant)
 *
 * SECURITY: platformAdmin middleware enforced
 */
router.get("/:id", platformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            preferredLanguage: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
            legalName: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!employee || employee.deletedAt) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    logger.error(
      { error, employeeId: req.params.id },
      "Failed to fetch employee (platform)",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/platform/employees
 * Create new employee (requires tenantId in body)
 *
 * SECURITY:
 * - platformAdmin middleware enforced
 * - Zod schema validation (requires tenantId)
 * - Audit logging
 */
router.post("/", platformAdmin, async (req, res) => {
  try {
    const validatedInput = createEmployeeSchema.parse(req.body);

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: validatedInput.tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedInput.email },
    });

    if (existingUser) {
      // Check if employee already exists for this user + tenant
      const existingEmployee = await prisma.employee.findFirst({
        where: {
          userId: existingUser.id,
          tenantId: validatedInput.tenantId,
          deletedAt: null,
        },
      });

      if (existingEmployee) {
        res.status(400).json({
          error: "Validation error",
          message:
            "Employee record already exists for this user in this tenant",
        });
        return;
      }
    }

    // Use EmployeeService for consistent logic (import it)
    // For now, inline the creation logic
    const bcrypt = require("bcrypt");
    const defaultPassword = validatedInput.password || "TorreTempo2024!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            email: validatedInput.email,
            firstName: validatedInput.firstName,
            lastName: validatedInput.lastName,
            password: hashedPassword,
            status: "active",
            preferredLanguage: "es",
          },
        });
      }

      // Create TenantUser relationship
      const existingTenantUser = await tx.tenantUser.findFirst({
        where: { userId: user!.id, tenantId: validatedInput.tenantId },
      });
      if (!existingTenantUser) {
        await tx.tenantUser.create({
          data: {
            userId: user!.id,
            tenantId: validatedInput.tenantId,
            role: validatedInput.role || "employee",
          },
        });
      }

      // Create employee record
      const employee = await tx.employee.create({
        data: {
          userId: user!.id,
          tenantId: validatedInput.tenantId,
          nationalId: validatedInput.nationalId,
          socialSecurity: validatedInput.socialSecurity,
          phone: validatedInput.phone,
          emergencyContact: validatedInput.emergencyContact,
          employeeNumber: validatedInput.employeeNumber,
          departmentId: validatedInput.departmentId,
          position: validatedInput.position,
          contractType: validatedInput.contractType,
          hireDate: new Date(validatedInput.hireDate),
          workSchedule: validatedInput.workSchedule || "full-time",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          tenant: {
            select: {
              id: true,
              slug: true,
              legalName: true,
            },
          },
        },
      });

      return employee;
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        employeeId: result.id,
        tenantId: validatedInput.tenantId,
        action: "platform_create_employee",
      },
      "Platform admin created employee",
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error({ error }, "Failed to create employee (platform)");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/v1/platform/employees/:id
 * Update employee (cross-tenant)
 *
 * SECURITY:
 * - platformAdmin middleware enforced
 * - Zod schema validation
 * - Audit logging
 */
router.put("/:id", platformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedInput = updateEmployeeSchema.parse(req.body);

    // Check employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee || existingEmployee.deletedAt) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: validatedInput,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
            legalName: true,
          },
        },
      },
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        employeeId: employee.id,
        tenantId: employee.tenantId,
        action: "platform_update_employee",
        changes: Object.keys(validatedInput),
      },
      "Platform admin updated employee",
    );

    res.json({ success: true, data: employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error(
      { error, employeeId: req.params.id },
      "Failed to update employee (platform)",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/v1/platform/employees/:id
 * Soft delete employee (cross-tenant)
 *
 * SECURITY:
 * - platformAdmin middleware enforced
 * - Soft delete only (preserves data for audit/compliance)
 * - Audit logging with WARNING level
 */
router.delete("/:id", platformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: {
        tenant: { select: { slug: true, legalName: true } },
        user: { select: { email: true } },
      },
    });

    if (!existingEmployee || existingEmployee.deletedAt) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    // Soft delete
    await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: "terminated" },
    });

    // Audit log with WARNING level (employee deletion is critical)
    logger.warn(
      {
        userId: (req as any).user?.userId,
        employeeId: id,
        tenantId: existingEmployee.tenantId,
        tenantSlug: existingEmployee.tenant.slug,
        userEmail: existingEmployee.user.email,
        action: "platform_delete_employee",
      },
      "CRITICAL: Platform admin soft deleted employee",
    );

    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    logger.error(
      { error, employeeId: req.params.id },
      "Failed to delete employee (platform)",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
