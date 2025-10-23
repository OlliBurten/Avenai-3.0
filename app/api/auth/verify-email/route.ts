import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'
import { sendEmail, createEmailVerificationEmail } from '@/lib/email'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

// Send email verification
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
      }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, we\'ve sent a verification link.'
      })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({
        message: 'Email is already verified'
      })
    }

    // Create verification token (expires in 24 hours)
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

    // Send email verification
    const emailTemplate = createEmailVerificationEmail(user.email!, verificationUrl)
    const emailResult = await sendEmail(emailTemplate)

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Still return success to prevent email enumeration
    } else {
      console.log(`Verification email sent successfully to ${user.email}`)
    }

    return NextResponse.json({
      message: 'If an account with that email exists, we\'ve sent a verification link.',
      // Include verification URL in development for testing
      verificationUrl: process.env.NODE_ENV === 'development' ? verificationUrl : undefined
    })

  } catch (error) {
    console.error('Email verification request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify email with token
export async function PUT(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      
      if (payload.type !== 'email-verification') {
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

      // Update user as verified
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          emailVerified: new Date(),
          emailVerifiedAt: new Date()
        }
      })

      return NextResponse.json({
        message: 'Email verified successfully'
      })

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
