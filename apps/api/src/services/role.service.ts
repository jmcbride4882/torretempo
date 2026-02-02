import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Role {
  name: string;
  color: string;
}

// Default roles (same as frontend)
export const DEFAULT_ROLES: Role[] = [
  // Management (Purple/Indigo)
  { name: "General Manager", color: "#6366f1" },
  { name: "Manager", color: "#8b5cf6" },
  { name: "Assistant Manager", color: "#a78bfa" },
  { name: "Supervisor", color: "#c4b5fd" },

  // Kitchen (Red/Orange)
  { name: "Head Chef", color: "#dc2626" },
  { name: "Sous Chef", color: "#ef4444" },
  { name: "Chef", color: "#f87171" },
  { name: "Cook", color: "#f59e0b" },
  { name: "Kitchen Porter", color: "#fb923c" },

  // Bar (Green)
  { name: "Bar Manager", color: "#059669" },
  { name: "Bartender", color: "#10b981" },

  // Front of House (Blue)
  { name: "Receptionist", color: "#0284c7" },
  { name: "Waiter/Waitress", color: "#3b82f6" },
  { name: "Runner/Busser", color: "#60a5fa" },

  // Specialized (Various)
  { name: "Lifeguard", color: "#06b6d4" },
  { name: "Maintenance", color: "#f59e0b" },
  { name: "Accountant", color: "#1e293b" },
  { name: "Cleaning", color: "#94a3b8" },
  { name: "Security", color: "#475569" },
];

/**
 * Get all roles for a tenant
 */
export async function getRoles(tenantId: string): Promise<Role[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const settings = tenant.settings as any;
  return settings?.roles || DEFAULT_ROLES;
}

/**
 * Add a new role to tenant
 */
export async function addRole(tenantId: string, role: Role): Promise<Role[]> {
  const currentRoles = await getRoles(tenantId);
  const updatedRoles = [...currentRoles, role];

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...(await getTenantSettings(tenantId)),
        roles: updatedRoles,
      },
    },
  });

  return updatedRoles;
}

/**
 * Update all roles (for reordering or bulk edits)
 */
export async function updateRoles(
  tenantId: string,
  roles: Role[],
): Promise<Role[]> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...(await getTenantSettings(tenantId)),
        roles,
      },
    },
  });

  return roles;
}

/**
 * Update a specific role (including rename)
 * When renaming, automatically updates all shifts with the old role name
 */
export async function updateRole(
  tenantId: string,
  currentName: string,
  newRole: Role,
): Promise<Role[] | null> {
  const currentRoles = await getRoles(tenantId);
  const roleIndex = currentRoles.findIndex((r) => r.name === currentName);

  if (roleIndex === -1) {
    return null; // Role not found
  }

  // Update the role in the list
  const updatedRoles = [...currentRoles];
  updatedRoles[roleIndex] = newRole;

  // If role was renamed, update all shifts with the old role name
  if (currentName !== newRole.name) {
    await prisma.shift.updateMany({
      where: {
        schedule: { tenantId },
        role: currentName,
      },
      data: {
        role: newRole.name,
      },
    });
  }

  // Save updated roles
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...(await getTenantSettings(tenantId)),
        roles: updatedRoles,
      },
    },
  });

  return updatedRoles;
}

/**
 * Delete a role (with optional reassignment)
 */
export async function deleteRole(
  tenantId: string,
  roleName: string,
  reassignTo?: string,
): Promise<Role[]> {
  const currentRoles = await getRoles(tenantId);
  const updatedRoles = currentRoles.filter((r) => r.name !== roleName);

  // If reassigning, update all shifts with the deleted role
  if (reassignTo) {
    await prisma.shift.updateMany({
      where: {
        schedule: { tenantId },
        role: roleName,
      },
      data: {
        role: reassignTo,
      },
    });
  }

  // Save updated roles
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...(await getTenantSettings(tenantId)),
        roles: updatedRoles,
      },
    },
  });

  return updatedRoles;
}

/**
 * Get usage statistics for a role
 */
export async function getRoleUsage(
  tenantId: string,
  roleName: string,
): Promise<{ count: number; shiftIds: string[] }> {
  const shifts = await prisma.shift.findMany({
    where: {
      schedule: { tenantId },
      role: roleName,
    },
    select: { id: true },
  });

  return {
    count: shifts.length,
    shiftIds: shifts.map((s) => s.id),
  };
}

/**
 * Get total shift count for tenant
 */
export async function getTotalShiftCount(tenantId: string): Promise<number> {
  return await prisma.shift.count({
    where: {
      schedule: { tenantId },
    },
  });
}

/**
 * Reset roles to defaults
 * Attempts to reassign existing shifts to matching default roles
 */
export async function resetToDefaultRoles(tenantId: string): Promise<Role[]> {
  const currentRoles = await getRoles(tenantId);

  // Build a mapping from old roles to new roles (best match)
  const roleMapping: Record<string, string> = {};

  for (const oldRole of currentRoles) {
    // Try exact match first
    const exactMatch = DEFAULT_ROLES.find((r) => r.name === oldRole.name);
    if (exactMatch) {
      roleMapping[oldRole.name] = exactMatch.name;
      continue;
    }

    // Try case-insensitive match
    const caseInsensitiveMatch = DEFAULT_ROLES.find(
      (r) => r.name.toLowerCase() === oldRole.name.toLowerCase(),
    );
    if (caseInsensitiveMatch) {
      roleMapping[oldRole.name] = caseInsensitiveMatch.name;
      continue;
    }

    // Try partial match (contains)
    const partialMatch = DEFAULT_ROLES.find(
      (r) =>
        r.name.toLowerCase().includes(oldRole.name.toLowerCase()) ||
        oldRole.name.toLowerCase().includes(r.name.toLowerCase()),
    );
    if (partialMatch) {
      roleMapping[oldRole.name] = partialMatch.name;
      continue;
    }

    // Default fallback: use first default role
    roleMapping[oldRole.name] = DEFAULT_ROLES[0].name;
  }

  // Update all shifts with the mapping
  for (const [oldName, newName] of Object.entries(roleMapping)) {
    await prisma.shift.updateMany({
      where: {
        schedule: { tenantId },
        role: oldName,
      },
      data: {
        role: newName,
      },
    });
  }

  // Save default roles
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...(await getTenantSettings(tenantId)),
        roles: DEFAULT_ROLES,
      },
    },
  });

  return DEFAULT_ROLES;
}

/**
 * Helper: Get current tenant settings
 */
async function getTenantSettings(tenantId: string): Promise<any> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  return (tenant?.settings as any) || {};
}
