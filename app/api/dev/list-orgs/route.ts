import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Find all users with oliver@avenai.io email
    const users = await prisma.user.findMany({
      where: {
        email: 'oliver@avenai.io'
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        organizationId: true,
      }
    });

    // Find all memberships for these users
    const userIds = users.map(u => u.id);
    const memberships = await prisma.membership.findMany({
      where: {
        userId: { in: userIds }
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            onboardingCompleted: true,
            createdAt: true,
          }
        }
      }
    });

    // Get dataset counts for each organization
    const orgIds = memberships.map(m => m.orgId);
    const datasets = await prisma.dataset.findMany({
      where: {
        organizationId: { in: orgIds }
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
      }
    });

    const datasetsByOrg = datasets.reduce((acc, ds) => {
      if (!acc[ds.organizationId]) acc[ds.organizationId] = [];
      acc[ds.organizationId].push(ds);
      return acc;
    }, {} as Record<string, typeof datasets>);

    return NextResponse.json({
      users,
      memberships: memberships.map(m => ({
        ...m,
        datasetCount: datasetsByOrg[m.orgId]?.length || 0,
        datasets: datasetsByOrg[m.orgId] || []
      })),
      summary: {
        totalUsers: users.length,
        totalOrganizations: orgIds.length,
        totalDatasets: datasets.length,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('[DEV] Error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}


