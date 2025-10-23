import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = (session.user as any).id;

  // Find the user's organization
  const membership = await prisma.memberships.findFirst({
    where: { userId },
    select: { orgId: true }
  });

  if (!membership) {
    return NextResponse.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  // Save goals to organization settings
  await prisma.organization.update({
    where: { id: membership.orgId },
    data: {
      settings: {
        onboardingGoals: body.goals || null,
      }
    },
  });

  console.log(`[ONBOARDING_SAVE_INTENT] orgId: ${membership.orgId}, goals: ${JSON.stringify(body.goals)}`);
  return NextResponse.json({ ok: true });
}