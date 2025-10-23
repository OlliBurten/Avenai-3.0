#!/usr/bin/env node

/**
 * Update Founder to Super Admin Script
 * Updates oliver@avenai.io to SUPER_ADMIN role
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateFounderToSuperAdmin() {
  try {
    console.log('🚀 Updating founder to SUPER_ADMIN...')

    // Find the founder user
    const founder = await prisma.user.findFirst({
      where: {
        email: 'oliver@avenai.io'
      },
      include: {
        organization: true
      }
    })

    if (!founder) {
      console.log('❌ Founder user not found. Please create the account first.')
      return
    }

    console.log('✅ Found founder user:', founder.email)
    console.log('📧 Current role:', founder.role)
    console.log('🏢 Organization:', founder.organization.name)

    // Update to SUPER_ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: founder.id },
      data: { 
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isActive: true
      }
    })

    console.log('✅ Founder updated successfully!')
    console.log('👑 New role: SUPER_ADMIN')
    console.log('📧 Email:', updatedUser.email)
    console.log('🔐 Verified:', updatedUser.emailVerified)
    console.log('✅ Active:', updatedUser.isActive)

  } catch (error) {
    console.error('❌ Error updating founder:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateFounderToSuperAdmin()
