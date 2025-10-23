import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Helper function to check if user is super admin
function isSuperAdmin(user: any): boolean {
  return user.role === 'SUPER_ADMIN'
}

// GET /api/admin/organizations/[id] - Get specific organization details
async function handleGetOrganization(req: NextRequest, session: any) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    // Extract ID from URL
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Organization ID is required',
        statusCode: 400
      })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: id },
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
async function handleUpdateOrganization(req: NextRequest, session: any) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    // Extract ID from URL
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Organization ID is required',
        statusCode: 400
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
    const validTiers = ['FREE', 'PRO', 'FOUNDER']
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
          NOT: { id: id }
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
      where: { id: id },
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
async function handleDeleteOrganization(req: NextRequest, session: any) {
  try {
    if (!isSuperAdmin(session.user)) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
        statusCode: 403
      })
    }

    // Extract ID from URL
    const url = new URL(req.url)
    const id = url.pathname.split('/').pop()

    if (!id) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Organization ID is required',
        statusCode: 400
      })
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: id },
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
        where: { organizationId: id },
        data: { isActive: false }
      })

      // Mark organization as cancelled
      await tx.organization.update({
        where: { id: id },
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

export const GET = withAuth(handleGetOrganization)
export const PATCH = withAuth(handleUpdateOrganization)
export const DELETE = withAuth(handleDeleteOrganization)
