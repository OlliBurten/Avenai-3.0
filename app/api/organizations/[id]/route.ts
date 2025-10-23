import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, withAuth } from '@/lib/api-utils'

// GET /api/organizations/[id] - Get organization details
export const GET = withAuth(async (req: NextRequest, session: any) => {
  try {
    const url = new URL(req.url)
    const organizationId = url.pathname.split('/').pop()

    if (!organizationId) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Organization ID is required',
        statusCode: 400
      })
    }

    // Check if user has access to this organization
    if (session.user.organizationId !== organizationId && session.user.role !== 'SUPER_ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        statusCode: 403
      })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        logoUrl: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        settings: true,
        widgetSettings: true,
        ssoSettings: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!organization) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found',
        statusCode: 404
      })
    }

    return createResponse(organization, 'Organization retrieved successfully')

  } catch (error) {
    console.error('Organization fetch error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch organization',
      statusCode: 500
    })
  }
})
