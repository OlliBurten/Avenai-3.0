import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Find the user's organization via membership
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { orgId: true, org: { select: { id: true, name: true, onboardingCompleted: true } } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    console.log(`[DEV] Found organization: ${membership.org.id}, onboardingCompleted: ${membership.org.onboardingCompleted}`);

    // Mark onboarding as completed
    await prisma.organization.update({
      where: { id: membership.orgId },
      data: { onboardingCompleted: true },
    });

    console.log(`[DEV] Marked organization ${membership.orgId} as onboarding completed`);

    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding marked as completed',
      organizationId: membership.orgId,
      organizationName: membership.org.name
    });
  } catch (error) {
    console.error('[DEV] Error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}


