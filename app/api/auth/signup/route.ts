import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { SignJWT } from 'jose'
import { sendEmail, createEmailVerificationEmail } from '@/lib/email'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      organizationName,
      organizationSlug,
      firstName,
      lastName,
      email,
      password
    } = body

    // Validate required fields
    if (!organizationName || !organizationSlug || !firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Validate organization slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(organizationSlug)) {
      return NextResponse.json(
        { error: "Organization slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      )
    }

    // Check if email already exists (check this first as it's more common)
    const existingUser = await prisma.user.findFirst({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 400 }
      )
    }

    // Check if organization slug already exists
    const existingOrganization = await prisma.organization.findUnique({
      where: { slug: organizationSlug }
    })

    if (existingOrganization) {
      return NextResponse.json(
        { error: `The organization slug "${organizationSlug}" is already taken. Please choose a different one.` },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
          subscriptionTier: "FREE",
          subscriptionStatus: "ACTIVE"
        }
      })

      // Create user
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          firstName,
          lastName,
          role: "OWNER",
          emailVerified: null // Require email verification
        }
      })

      return { organization, user }
    })

    // Send email verification
    let verificationToken = ''
    try {
      verificationToken = await new SignJWT({
        userId: result.user.id,
        email: result.user.email,
        type: 'email-verification'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(JWT_SECRET)

      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`
      
      const emailTemplate = createEmailVerificationEmail(result.user.email!, verificationUrl)
      const emailResult = await sendEmail(emailTemplate)

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error)
      } else {
        console.log(`Verification email sent successfully to ${result.user.email}`)
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail the signup if email sending fails
    }

    return NextResponse.json({
      message: "Account created successfully. Please check your email to verify your account.",
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName
      },
      // Include verification URL in development for testing
      verificationUrl: process.env.NODE_ENV === 'development' && verificationToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}` : undefined
    })

  } catch (error) {
    console.error("Signup error:", error)
    
    // Handle specific database constraint errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed on the constraint: `organizations_slug_key`')) {
        return NextResponse.json(
          { error: "The organization slug is already taken. Please choose a different one." },
          { status: 400 }
        )
      }
      
      if (error.message.includes('Unique constraint failed on the constraint: `users_organizationId_email_key`')) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please sign in instead." },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    )
  }
}
