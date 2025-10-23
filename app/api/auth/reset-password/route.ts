import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { sendEmail, createPasswordResetEmail } from '@/lib/email'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        isActive: true
      },
      include: {
        organization: true
      }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, we\'ve sent a password reset link.'
      })
    }

    // Create reset token (expires in 1 hour)
    const resetToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      type: 'password-reset'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(JWT_SECRET)

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

    // Send password reset email
    const emailTemplate = createPasswordResetEmail(user.email!, resetUrl)
    const emailResult = await sendEmail(emailTemplate)

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to prevent email enumeration
    } else {
      console.log(`Password reset email sent successfully to ${user.email}`)
    }

    return NextResponse.json({
      message: 'If an account with that email exists, we\'ve sent a password reset link.',
      // Include reset URL in development for testing
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      )
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      
      if (payload.type !== 'password-reset') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 400 }
        )
      }

      // Verify user still exists and is active
      const user = await prisma.user.findFirst({
        where: {
          id: payload.userId as string,
          email: payload.email as string,
          isActive: true
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found or inactive' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        valid: true,
        email: user.email
      })

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Reset password with token
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      
      if (payload.type !== 'password-reset') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 400 }
        )
      }

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          id: payload.userId as string,
          email: payload.email as string,
          isActive: true
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found or inactive' },
          { status: 404 }
        )
      }

      // Hash new password
      const bcrypt = await import('bcryptjs')
      const passwordHash = await bcrypt.hash(password, 12)

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      })

      return NextResponse.json({
        message: 'Password reset successfully'
      })

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
