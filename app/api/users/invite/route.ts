import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'

// Invite a user to the organization
async function handleInviteUser(req: NextRequest, session: any) {
  try {
    const { email, firstName, lastName, role = 'MEMBER' } = await req.json()
    const organizationId = session.user.organizationId

    // Only SUPER_ADMIN, OWNER and ADMIN can invite users
    if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to invite users',
        statusCode: 403
      })
    }

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Email, first name, and last name are required',
        statusCode: 400
      })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        isActive: true
      }
    })

    if (existingUser) {
      return createErrorResponse({
        code: 'CONFLICT',
        message: 'A user with this email already exists',
        statusCode: 409
      })
    }

    // Create user with default password
    const defaultPassword = 'password123'
    const passwordHash = await bcrypt.hash(defaultPassword, 12)

    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role: role as any,
        organizationId,
        isActive: true,
        emailVerified: null
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
      }
    })

    return createResponse({
      user: newUser,
      message: `User ${email} has been invited with default password: ${defaultPassword}`
    }, 'User invited successfully')

  } catch (error) {
    console.error('Invite user error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to invite user',
      statusCode: 500
    })
  }
}

export const POST = withAuth(handleInviteUser)
