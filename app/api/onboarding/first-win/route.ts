import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { track } = await req.json().catch(() => ({} as any));
    // track.choice: "complete" (new simplified flow)

    const userId = (session.user as any).id;
    
    // Find the user's organization via membership
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      select: { orgId: true }
    });

    if (!membership) {
      return NextResponse.json({ ok: false, error: "No organization found" }, { status: 404 });
    }

    console.log(`[FIRST_WIN] Marking organization ${membership.orgId} as onboarding completed`);

    // Simply mark onboarding as completed - no dataset creation needed
    await prisma.organization.update({
      where: { id: membership.orgId },
      data: { onboardingCompleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("FIRST_WIN_ERROR", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}