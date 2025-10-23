import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated', authenticated: false }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Find the user's organization via membership
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { 
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            onboardingCompleted: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ 
        error: 'No organization found',
        authenticated: true,
        userId,
        hasMembership: false
      });
    }

    return NextResponse.json({ 
      authenticated: true,
      userId,
      hasMembership: true,
      membership: {
        id: membership.id,
        role: membership.role,
        orgId: membership.orgId,
      },
      organization: membership.org
    });
  } catch (error) {
    console.error('[DEV] Error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}


