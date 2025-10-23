import { prisma } from "@/lib/prisma";

export async function ensureUserOrg(userId: string) {
  // Try to find an existing membership
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { org: true },
  });
  if (membership?.org) {
    return membership.org;
  }

  // Create a personal org + owner membership
  const org = await prisma.organization.create({
    data: {
      name: "My Organization",
      slug: `personal-${userId}`,
      onboardingCompleted: false,
      owner: { connect: { id: userId } },
      memberships: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  return org;
}
