import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'
import { SignJWT } from 'jose'
import { sendEmail, createEmailVerificationEmail } from '@/lib/email'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

// Get user profile
async function handleGetProfile(req: NextRequest, session: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscriptionTier: true,
            subscriptionStatus: true
          }
        }
      }
    })

    if (!user) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404
      })
    }

    return createResponse({ user }, 'Profile retrieved successfully')
  } catch (error) {
    console.error('Get profile error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch profile',
      statusCode: 500
    })
  }
}

// Update user profile
async function handleUpdateProfile(req: NextRequest, session: any) {
  try {
    const body = await req.json()
    const { firstName, lastName, email } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'First name, last name, and email are required',
        statusCode: 400
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Invalid email format',
        statusCode: 400
      })
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: session.user.id }
      }
    })

    if (existingUser) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Email already in use',
        statusCode: 400
      })
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        email
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscriptionTier: true,
            subscriptionStatus: true
          }
        }
      }
    })

    return createResponse({
      message: 'Profile updated successfully',
      user: updatedUser
    }, 'Profile updated successfully')
  } catch (error) {
    console.error('Update profile error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update profile',
      statusCode: 500
    })
  }
}

// Change password
async function handleChangePassword(req: NextRequest, session: any) {
  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Current password and new password are required',
        statusCode: 400
      })
    }

    if (newPassword.length < 8) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'New password must be at least 8 characters long',
        statusCode: 400
      })
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true }
    })

    if (!user?.passwordHash) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Current password is incorrect',
        statusCode: 400
      })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash }
    })

    return createResponse({
      message: 'Password changed successfully'
    }, 'Password changed successfully')
  } catch (error) {
    console.error('Change password error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to change password',
      statusCode: 500
    })
  }
}

// Resend verification email
async function handleResendVerification(req: NextRequest, session: any) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true
      }
    })

    if (!user) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404
      })
    }

    // Check if already verified
    if (user.emailVerified) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Email is already verified',
        statusCode: 400
      })
    }

    // Create verification token
    const verificationToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      type: 'email-verification'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET)

    // Create verification URL
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`
    
    // Send verification email
    const emailTemplate = createEmailVerificationEmail(user.email!, verificationUrl)
    const emailResult = await sendEmail(emailTemplate)

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      return createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: 'Failed to send verification email',
        statusCode: 500
      })
    }

    return createResponse({
      message: 'Verification email sent successfully'
    }, 'Verification email sent successfully')

  } catch (error) {
    console.error('Resend verification error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to send verification email',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetProfile)
export const PUT = withAuth(handleUpdateProfile)
export const PATCH = withAuth(handleChangePassword)
export const POST = withAuth(handleResendVerification)
