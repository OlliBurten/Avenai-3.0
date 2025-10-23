import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Find user's organization through memberships
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { org: true },
    });

    if (!membership?.org) {
      return NextResponse.json({ ok: false, error: 'No organization found' }, { status: 400 });
    }

    const orgId = membership.org.id;

    // Get datasets count for the organization
    const datasetsCount = await prisma.dataset.count({
      where: { 
        organizationId: orgId,
        isActive: true
      },
    });

    return NextResponse.json({ 
      ok: true, 
      data: { 
        hasDatasets: datasetsCount > 0,
        count: datasetsCount
      } 
    });

  } catch (error) {
    console.error('Integration status error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}


