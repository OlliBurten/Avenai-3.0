import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Get all users in the organization
async function handleGetUsers(req: NextRequest, session: any) {
  try {
    const organizationId = session.user.organizationId

    // Only SUPER_ADMIN, OWNER and ADMIN can manage users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to manage users',
        statusCode: 403
      })
    }

    const users = await prisma.user.findMany({
      where: {
        organizationId: organizationId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return createResponse({
      users
    }, 'Users retrieved successfully')

  } catch (error) {
    console.error('Get users error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch users',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetUsers)
