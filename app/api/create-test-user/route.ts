import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Create test organization with unique slug
    const organization = await prisma.organization.upsert({
      where: { slug: 'test-org' },
      update: {},
      create: {
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE'
      }
    })

    // Create test user with compound unique constraint
    const passwordHash = await bcrypt.hash('password123', 10)
    const user = await prisma.user.upsert({
      where: { 
        email: 'test@example.com'
      },
      update: {},
      create: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: passwordHash,
        role: 'ADMIN',
        organizationId: organization.id,
        isActive: true
      },
      include: {
        organization: true
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization
      }
    })
  } catch (error) {
    console.error('Create test user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
