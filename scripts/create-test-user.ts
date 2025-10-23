// scripts/create-test-user.ts
import { prisma } from '../lib/prisma'

async function createTestUser() {
  try {
    // Create organization first
    const org = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org',
        subscriptionTier: 'PRO',
        ownerId: null // We'll update this after creating the user
      }
    })

    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test@avenai.local',
        name: 'Test User',
        role: 'OWNER',
        organizationId: org.id,
        isActive: true
      }
    })

    // Update organization with owner
    await prisma.organization.update({
      where: { id: org.id },
      data: { ownerId: user.id }
    })

    console.log('✅ Test user created:', {
      userId: user.id,
      email: user.email,
      organizationId: org.id,
      organizationName: org.name
    })

    console.log('\n🔑 You can now sign in with:')
    console.log('Email: test@avenai.local')
    console.log('(Use any password - authentication is bypassed in dev)')

  } catch (error) {
    console.error('❌ Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()


