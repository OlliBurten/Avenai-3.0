import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Helper function to check if user is super admin
function isSuperAdmin(user: any): boolean {
  return user.role === 'SUPER_ADMIN'
}

// GET /api/admin/stats - Get platform-wide statistics
async function handleGetStats(req: NextRequest, session: any) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      totalDocuments,
      totalDatasets,
      totalChatSessions,
      revenueStats
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { subscriptionStatus: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.document.count(),
      prisma.dataset.count(),
      prisma.chatSession.count(),
      prisma.organization.groupBy({
        by: ['subscriptionTier'],
        _count: { id: true },
        where: { subscriptionStatus: 'ACTIVE' }
      })
    ])

    const stats = {
      overview: {
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        activeUsers,
        totalDocuments,
        totalDatasets,
        totalChatSessions
      },
      revenue: {
        freeTier: revenueStats.find(r => r.subscriptionTier === 'FREE')?._count.id || 0,
        proTier: revenueStats.find(r => r.subscriptionTier === 'PRO')?._count.id || 0,
        founderTier: revenueStats.find(r => r.subscriptionTier === 'FOUNDER')?._count.id || 0
      }
    }

    return createResponse({
      stats
    }, 'Platform statistics retrieved successfully')

  } catch (error) {
    console.error('Get stats error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve platform statistics',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetStats)
