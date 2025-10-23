import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Helper function to check if user is super admin
function isSuperAdmin(user: any): boolean {
  return user.role === 'SUPER_ADMIN'
}

// GET /api/admin/organizations - List all organizations
async function handleGetOrganizations(req: NextRequest, session: any) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.subscriptionStatus = status
    }

    // Get organizations with user counts
    const [organizations, totalCount] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              emailVerified: true,
              lastLoginAt: true
            }
          },
          _count: {
            select: {
              documents: true,
              datasets: true,
              chatSessions: true
            }
          }
        }
      }),
      prisma.organization.count({ where })
    ])

    // Calculate additional metrics
    const organizationsWithMetrics = organizations.map(org => ({
      ...org,
      metrics: {
        totalUsers: org.users.length,
        activeUsers: org.users.filter(u => u.isActive).length,
        verifiedUsers: org.users.filter(u => u.emailVerified).length,
        totalDocuments: org._count.documents,
        totalDatasets: org._count.datasets,
        totalChatSessions: org._count.chatSessions,
        lastActivity: org.users.reduce((latest, user) => {
          if (!user.lastLoginAt) return latest
          return !latest || user.lastLoginAt > latest ? user.lastLoginAt : latest
        }, null as Date | null)
      }
    }))

    return createResponse({
      organizations: organizationsWithMetrics,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    }, 'Organizations retrieved successfully')

  } catch (error) {
    console.error('Get organizations error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve organizations',
      statusCode: 500
    })
  }
}

// GET /api/admin/organizations/[id] - Get specific organization details
async function handleGetOrganization(req: NextRequest, session: any, { params }: { params: { id: string } }) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            emailVerified: true,
            lastLoginAt: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        datasets: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        chatSessions: {
          select: {
            id: true,
            sessionId: true,
            userIdentifier: true,
            startedAt: true,
            lastActivityAt: true
          },
          orderBy: { lastActivityAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            documents: true,
            datasets: true,
            chatSessions: true,
            analyticsEvents: true
          }
        }
      }
    })

    if (!organization) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found',
        statusCode: 404
      })
    }

    return createResponse({
      organization
    }, 'Organization details retrieved successfully')

  } catch (error) {
    console.error('Get organization error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve organization',
      statusCode: 500
    })
  }
}

// PATCH /api/admin/organizations/[id] - Update organization
async function handleUpdateOrganization(req: NextRequest, session: any, { params }: { params: { id: string } }) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    const body = await req.json()
    const { 
      name, 
      slug, 
      domain, 
      subscriptionTier, 
      subscriptionStatus,
      settings 
    } = body

    // Validate subscription tier and status
    const validTiers = ['FREE', 'PRO', 'ENTERPRISE']
    const validStatuses = ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED']

    if (subscriptionTier && !validTiers.includes(subscriptionTier)) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Invalid subscription tier',
        statusCode: 400
      })
    }

    if (subscriptionStatus && !validStatuses.includes(subscriptionStatus)) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Invalid subscription status',
        statusCode: 400
      })
    }

    // Check if slug is unique (if being updated)
    if (slug) {
      const existingOrg = await prisma.organization.findFirst({
        where: {
          slug,
          NOT: { id: params.id }
        }
      })

      if (existingOrg) {
        return createErrorResponse({
          code: 'CONFLICT',
          message: 'Organization slug already exists',
          statusCode: 409
        })
      }
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(domain && { domain }),
        ...(subscriptionTier && { subscriptionTier }),
        ...(subscriptionStatus && { subscriptionStatus }),
        ...(settings && { settings })
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true
          }
        }
      }
    })

    return createResponse({
      organization: updatedOrganization
    }, 'Organization updated successfully')

  } catch (error) {
    console.error('Update organization error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update organization',
      statusCode: 500
    })
  }
}

// DELETE /api/admin/organizations/[id] - Delete organization (soft delete)
async function handleDeleteOrganization(req: NextRequest, session: any, { params }: { params: { id: string } }) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        _count: {
          select: {
            documents: true,
            datasets: true,
            chatSessions: true
          }
        }
      }
    })

    if (!organization) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found',
        statusCode: 404
      })
    }

    // Soft delete: deactivate all users and mark organization as cancelled
    await prisma.$transaction(async (tx) => {
      // Deactivate all users
      await tx.user.updateMany({
        where: { organizationId: params.id },
        data: { isActive: false }
      })

      // Mark organization as cancelled
      await tx.organization.update({
        where: { id: params.id },
        data: { 
          subscriptionStatus: 'CANCELLED',
          settings: {
            ...organization.settings as any,
            deletedAt: new Date().toISOString(),
            deletedBy: session.user.id
          }
        }
      })
    })

    return createResponse({
      message: 'Organization deactivated successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subscriptionStatus: 'CANCELLED'
      }
    }, 'Organization deactivated successfully')

  } catch (error) {
    console.error('Delete organization error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete organization',
      statusCode: 500
    })
  }
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

export const GET = withAuth(handleGetOrganizations)
export const POST = withAuth(handleGetStats)
