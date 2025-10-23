// scripts/seed-admin.ts
import { PrismaClient, OrgRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin seed...');

    // Get the first user (assuming you've signed in with Google at least once)
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!firstUser) {
      console.log('❌ No users found. Please sign in with Google first.');
      process.exit(1);
    }

    console.log(`👤 Found user: ${firstUser.email}`);

    // Check if user already has admin membership
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: firstUser.id,
        role: { in: [OrgRole.ADMIN, OrgRole.OWNER] }
      },
      include: { org: true }
    });

    if (existingMembership) {
      console.log(`✅ User already has ${existingMembership.role} role in org: ${existingMembership.org.name}`);
      console.log(`🏢 Organization ID: ${existingMembership.orgId}`);
      process.exit(0);
    }

    // Find or create an organization
    let organization = await prisma.organization.findFirst({
      where: { ownerId: firstUser.id }
    });

    if (!organization) {
      // Create organization
      organization = await prisma.organization.create({
        data: {
          name: `${firstUser.name || firstUser.email?.split('@')[0] || 'Admin'}'s Organization`,
          slug: `admin-${firstUser.id}`,
          ownerId: firstUser.id,
        }
      });
      console.log(`🏢 Created organization: ${organization.name}`);
    }

    // Create admin membership
    const membership = await prisma.membership.create({
      data: {
        userId: firstUser.id,
        orgId: organization.id,
        role: OrgRole.OWNER,
      }
    });

    console.log(`✅ Created ${membership.role} membership for user`);
    console.log(`🏢 Organization ID: ${organization.id}`);
    console.log(`🔑 You can now access /admin/rag`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
