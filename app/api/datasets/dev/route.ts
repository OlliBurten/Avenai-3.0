import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

// Development-only endpoint that returns datasets
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization through membership
    const membership = await prisma.membership.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true },
    });

    if (!membership?.org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get active datasets from the user's organization
    const datasets = await prisma.dataset.findMany({
      where: { 
        isActive: true,
        organizationId: membership.org.id
      },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      items: datasets,
      message: 'Datasets retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching datasets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    )
  }
}

