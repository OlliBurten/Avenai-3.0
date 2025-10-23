import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking user data for oliver@avenai.io...');
  
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: 'oliver@avenai.io' },
    include: { 
      memberships: { 
        include: { 
          org: true 
        } 
      } 
    }
  });

  if (!user) {
    console.log('❌ User oliver@avenai.io not found');
    return;
  }

  console.log('👤 User:', {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId
  });

  console.log('🏢 Memberships:', user.memberships.map(m => ({
    id: m.id,
    userId: m.userId,
    orgId: m.orgId,
    role: m.role,
    orgName: m.org?.name,
    orgSlug: m.org?.slug
  })));

  // Check what the JWT callback should be setting
  const membership = user.memberships[0];
  if (membership) {
    console.log('🎯 JWT should set:', {
      userId: user.id,
      orgId: membership.orgId,
      orgName: membership.org?.name,
      role: membership.role
    });
  } else {
    console.log('❌ No membership found for user');
  }
}

main().finally(() => prisma.$disconnect());
