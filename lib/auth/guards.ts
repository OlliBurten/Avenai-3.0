import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  organizationId?: string | null;
  role?: "OWNER"|"ADMIN"|"MEMBER"|"VIEWER";
};

export async function getSessionOrRedirect(requestUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(session.user as any)?.id) {
    const next = encodeURIComponent(requestUrl);
    return { redirect: `/auth/signin?next=${next}` as const };
  }
  return { session };
}

/** Minimal org snapshot for guards */
export async function getOrgSnapshot(userId: string) {
  const membership = await prisma.memberships.findFirst({
    where: { userId },
      select: {
        role: true,
        org: { select: { id: true, name: true, onboardingCompleted: true } }
      }
  });
  if (!membership) return null;
  return {
    orgId: membership.org.id,
    orgName: membership.org.name,
    onboardingCompleted: membership.org.onboardingCompleted,
    role: membership.role
  };
}

export function hasAdmin(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}