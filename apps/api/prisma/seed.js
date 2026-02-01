const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create or update platform user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const platformUser = await prisma.user.upsert({
    where: { email: 'admin@torretempo.com' },
    update: {},
    create: {
      email: 'admin@torretempo.com',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
    },
  });

  console.log('✅ Platform user ready:', platformUser.email);

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

  // Link user to tenant as admin
  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: platformUser.id,
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: platformUser.id,
      role: 'admin',
    },
  });

  console.log('✅ User linked to tenant');

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
