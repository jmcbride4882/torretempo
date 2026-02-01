import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== STEP 1: Create Platform Admin (Torre Tempo Owner) =====
  console.log('\n🌐 Creating Platform Admin...');
  const platformAdminHash = await bcrypt.hash('platform123', 10);
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'platform@torretempo.com' },
    update: {},
    create: {
      email: 'platform@torretempo.com',
      password: platformAdminHash,
      firstName: 'John',
      lastName: 'McBride',
      status: 'active',
    },
  });
  console.log('✅ PLATFORM_ADMIN user ready:', platformAdmin.email);

  // ===== STEP 2: Create Demo Tenant Users =====
  console.log('\n🏢 Creating Demo Tenant Users...');
  const demoUsers = [
    {
      email: 'owner@torretempo.com',
      password: 'owner123',
      firstName: 'Maria',
      lastName: 'Garcia',
      role: 'owner',
    },
    {
      email: 'admin@torretempo.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
    {
      email: 'manager@torretempo.com',
      password: 'manager123',
      firstName: 'Carlos',
      lastName: 'Lopez',
      role: 'manager',
    },
    {
      email: 'employee@torretempo.com',
      password: 'employee123',
      firstName: 'Ana',
      lastName: 'Rodriguez',
      role: 'employee',
    },
  ];

  const createdUsers = [];
  for (const userData of demoUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        status: 'active',
      },
    });
    createdUsers.push({ ...user, role: userData.role });
    console.log(`✅ ${userData.role.toUpperCase()} user ready:`, user.email);
  }

  // Create or update demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      legalName: 'Demo Restaurant SL',
      taxId: 'B12345678',
      email: 'demo@torretempo.com',
      phone: '+34912345678',
      address: 'Calle Demo, 1, Madrid',
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      currency: 'EUR',
      subscriptionStatus: 'active',
      settings: {
        workHours: {
          standardHoursPerDay: 8,
          standardHoursPerWeek: 40,
          overtimeThreshold: 'daily',
          overtimeRate: 1.5,
        },
        breaks: {
          autoDeduct: true,
          breakMinutes: 30,
          breakAfterHours: 6,
        },
      },
    },
  });

  console.log('✅ Demo tenant ready:', demoTenant.slug);

  // ===== STEP 4: Link Platform Admin to Tenant (with platform_admin role) =====
  console.log('\n🔗 Linking Platform Admin to Demo Tenant...');
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: platformAdmin.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: platformAdmin.id,
      role: 'platform_admin', // Special role
    },
  });
  console.log('✅ PLATFORM_ADMIN linked to demo tenant');

  // ===== STEP 5: Link all demo users to tenant with their roles =====
  console.log('\n🔗 Linking Demo Users to Tenant...');
  for (const userData of createdUsers) {
    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId: demoTenant.id,
          userId: userData.id,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        userId: userData.id,
        role: userData.role,
      },
    });
    console.log(`✅ ${userData.role.toUpperCase()} linked to tenant`);
  }

  // ===== STEP 6: Create Platform Admin Employee Record =====
  console.log('\n👤 Creating Employee Records...');
  await prisma.employee.upsert({
    where: { userId: platformAdmin.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: platformAdmin.id,
      nationalId: 'DNI-PLATFORM',
      socialSecurity: 'SS-PLATFORM',
      phone: '+34912345678',
      position: 'Torre Tempo Platform Administrator',
      contractType: 'indefinido',
      hireDate: new Date('2024-01-01'),
      workSchedule: '{"standard": "40h/week"}',
      status: 'active',
    },
  });
  console.log('✅ Employee record created for PLATFORM_ADMIN');

  // ===== STEP 7: Create employee records for all demo users =====
  for (const userData of createdUsers) {
    await prisma.employee.upsert({
      where: { userId: userData.id },
      update: {},
      create: {
        tenantId: demoTenant.id,
        userId: userData.id,
        nationalId: `DNI-${userData.role.toUpperCase()}`,
        socialSecurity: `SS-${userData.role.toUpperCase()}`,
        phone: '+34912345678',
        position: userData.role === 'owner' ? 'CEO' : 
                  userData.role === 'admin' ? 'Administrator' :
                  userData.role === 'manager' ? 'Department Manager' :
                  'Staff Member',
        contractType: 'indefinido',
        hireDate: new Date('2024-01-01'),
        workSchedule: '{"standard": "40h/week"}',
        status: 'active',
      },
    });
    console.log(`✅ Employee record created for ${userData.role.toUpperCase()}`);
  }

  // Enable advanced scheduling module
  await prisma.tenantModule.upsert({
    where: {
      tenantId_moduleKey: {
        tenantId: demoTenant.id,
        moduleKey: 'advanced_scheduling',
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      moduleKey: 'advanced_scheduling',
      enabled: true,
    },
  });

  console.log('✅ Advanced scheduling module enabled');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
