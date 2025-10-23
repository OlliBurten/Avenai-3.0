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
  
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    return NextResponse.json({ ok: false, error: "Company name required" }, { status: 400 });
  }

  // Ensure the user has an organization to update
  const userId = (session.user as any).id;
  let orgId = (session.user as any).organizationId || null;

  console.log(`[ONBOARDING_SAVE_COMPANY] userId: ${userId}, orgId: ${orgId}`);

  // Always check if the orgId actually exists in the database
  // This handles cases where orgId is a mock value like 'dev-org-123'
  let validOrgId = null;
  if (orgId) {
    const existingOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true }
    });
    if (existingOrg) {
      validOrgId = existingOrg.id;
      console.log(`[ONBOARDING_SAVE_COMPANY] Found valid organization, orgId: ${validOrgId}`);
    }
  }

  if (!validOrgId) {
    // Find first membership or create a personal org + membership
    const membership = await prisma.memberships.findFirst({ 
      where: { userId }, 
      select: { orgId: true } 
    });
    
    if (membership) {
      validOrgId = membership.orgId;
      console.log(`[ONBOARDING_SAVE_COMPANY] Found existing membership, orgId: ${validOrgId}`);
    } else {
      console.log(`[ONBOARDING_SAVE_COMPANY] Creating new organization for userId: ${userId}`);
      const personal = await prisma.organization.create({
        data: {
          name: `${session.user.name?.split(' ')[0] || 'Your'}'s Organization`,
          slug: `personal-${userId}`.slice(0, 48),
          ownerId: userId,
        },
        select: { id: true }
      });
      
      await prisma.memberships.create({
        data: { userId, orgId: personal.id, role: 'OWNER' }
      });
      
      validOrgId = personal.id;
      console.log(`[ONBOARDING_SAVE_COMPANY] Created new organization, orgId: ${validOrgId}`);
    }
  }

  orgId = validOrgId;

  // Update organization with company data
  try {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: body.name.trim(),
        domain: body.website?.trim() || null,
        settings: {
          teamSize: body.teamSize || null,
          onboardingStep: 'company',
        }
      },
    });

    console.log(`[ONBOARDING_SAVE_COMPANY] Successfully updated orgId: ${orgId}, name: ${body.name.trim()}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[ONBOARDING_SAVE_COMPANY] Failed to update organization ${orgId}:`, error);
    return NextResponse.json({ 
      ok: false, 
      error: `Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}