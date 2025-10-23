import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Find the user's organization via membership
    const membership = await prisma.memberships.findFirst({
      where: { userId },
      select: { orgId: true }
    });

    if (!membership) {
      return NextResponse.json({ ok: false, error: 'No organization found' }, { status: 404 });
    }

    console.log(`[ONBOARDING_COMPLETE] Marking organization ${membership.orgId} as onboarding completed`);

    await prisma.organization.update({
      where: { id: membership.orgId },
      data: { onboardingCompleted: true },
    });

    const res = NextResponse.json({ ok: true });
    // 10 minutes is generous; adjust as needed
    res.headers.append(
      'Set-Cookie',
      'av_onb=1; Path=/; Max-Age=600; SameSite=Lax; HttpOnly'
    );
    return res;
  } catch (e) {
    console.error('[ONBOARDING_COMPLETE] Error:', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}