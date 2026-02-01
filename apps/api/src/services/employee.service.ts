import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { emailService } from "./email.service";

const prisma = new PrismaClient();

interface CreateEmployeeWithUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role?: string;
  nationalId: string;
  socialSecurity: string;
  phone?: string;
  emergencyContact?: string;
  employeeNumber?: string;
  departmentId?: string;
  position?: string;
  contractType: string;
  hireDate: Date;
  workSchedule?: string;
}

interface UpdateEmployeeInput {
  phone?: string;
  emergencyContact?: string;
  position?: string;
  contractType?: string;
  workSchedule?: string;
  status?: string;
}

export class EmployeeService {
  async getAll(tenantId: string, userId?: string, userRole?: string) {
    // Employees can only see their own record
    // Managers and admins can see all employees
    const where: any = { tenantId, deletedAt: null };
    
    if (userRole === 'employee' && userId) {
      where.userId = userId;
    }
    
    return await prisma.employee.findMany({
      where,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string, tenantId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
    });
    if (!employee) throw new Error("Employee not found");
    return employee;
  }

  async create(input: CreateEmployeeWithUserInput, tenantId: string) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      const existingEmployee = await prisma.employee.findFirst({
        where: { userId: existingUser.id, tenantId, deletedAt: null },
      });
      if (existingEmployee) throw new Error("Employee record already exists for this user in this tenant");
    }

    const defaultPassword = input.password || "TorreTempo2024!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const isNewUser = !existingUser;

    const result = await prisma.$transaction(async (tx) => {
      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            password: hashedPassword,
            status: "active",
            preferredLanguage: "es",
          },
        });
      }

      const existingTenantUser = await tx.tenantUser.findFirst({ where: { userId: user.id, tenantId } });
      if (!existingTenantUser) {
        await tx.tenantUser.create({ data: { userId: user.id, tenantId, role: input.role || "employee" } });
      }

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          tenantId,
          nationalId: input.nationalId,
          socialSecurity: input.socialSecurity,
          phone: input.phone,
          emergencyContact: input.emergencyContact,
          employeeNumber: input.employeeNumber,
          departmentId: input.departmentId,
          position: input.position,
          contractType: input.contractType,
          hireDate: input.hireDate,
          workSchedule: input.workSchedule || "full-time",
        },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
      });

      return { employee, user, isNewUser };
    });

    logger.info({ employeeId: result.employee.id, tenantId }, "Employee created");

    if (result.isNewUser) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { legalName: true } });
      emailService.sendWelcomeEmail(tenantId, 
        result.user.email,
        result.user.firstName,
        defaultPassword,
        tenant?.legalName || "Torre Tempo",
        result.user.preferredLanguage || "es"
      ).catch((error) => logger.error({ error }, "Failed to send welcome email"));
    }

    return result.employee;
  }

  async update(id: string, input: UpdateEmployeeInput, tenantId: string) {
    const existing = await this.getById(id, tenantId);
    const employee = await prisma.employee.update({
      where: { id: existing.id },
      data: input,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
    });
    logger.info({ employeeId: employee.id, tenantId }, "Employee updated");
    return employee;
  }

  async delete(id: string, tenantId: string) {
    const existing = await this.getById(id, tenantId);
    await prisma.employee.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), status: "terminated" },
    });
    logger.info({ employeeId: id, tenantId }, "Employee deleted (soft)");
    return { success: true };
  }
}
