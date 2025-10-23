import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Update user status (activate/deactivate)
async function handlePatchUser(req: NextRequest, session: any) {
  try {
    const url = new URL(req.url)
    const userId = url.pathname.split('/').pop()
    const { isActive } = await req.json()
    const organizationId = session.user.organizationId

    // Only SUPER_ADMIN, OWNER and ADMIN can manage users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to manage users',
        statusCode: 403
      })
    }

    // Find the user - SUPER_ADMIN can manage users in any organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        ...(session.user.role !== 'SUPER_ADMIN' ? { organizationId: organizationId } : {})
      }
    })

    if (!user) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404
      })
    }

    // Prevent deactivating/deleting OWNER and SUPER_ADMIN
    if (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Cannot modify organization owner',
        statusCode: 403
      })
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
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
      }
    })

    return createResponse({
      user: updatedUser
    }, `User ${isActive ? 'activated' : 'deactivated'} successfully`)

  } catch (error) {
    console.error('Update user error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update user',
      statusCode: 500
    })
  }
}

// Delete user
async function handleDeleteUser(req: NextRequest, session: any) {
  try {
    const url = new URL(req.url)
    const userId = url.pathname.split('/').pop()
    const organizationId = session.user.organizationId

    // Only SUPER_ADMIN, OWNER and ADMIN can manage users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to manage users',
        statusCode: 403
      })
    }

    // Find the user - SUPER_ADMIN can manage users in any organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        ...(session.user.role !== 'SUPER_ADMIN' ? { organizationId: organizationId } : {})
      }
    })

    if (!user) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404
      })
    }

    // Prevent deleting OWNER and SUPER_ADMIN
    if (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Cannot delete organization owner',
        statusCode: 403
      })
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
      }
    })

    return createResponse({}, 'User deleted successfully')

  } catch (error) {
    console.error('Delete user error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete user',
      statusCode: 500
    })
  }
}

export const PATCH = withAuth(handlePatchUser)
export const DELETE = withAuth(handleDeleteUser)
