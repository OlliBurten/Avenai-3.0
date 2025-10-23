#!/usr/bin/env node

/**
 * Update Oliver's account to FOUNDER tier with unlimited access
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/avenai'
    }
  }
})

async function updateFounderTier() {
  try {
    console.log('🔍 Looking for Oliver\'s account...')
    
    // Find Oliver's user account
    const user = await prisma.user.findFirst({
      where: {
        email: 'oliver@avenai.io'
      },
      include: {
        organization: true
      }
    })

    if (!user) {
      console.error('❌ Oliver\'s account not found!')
      return
    }

    console.log(`✅ Found Oliver's account: ${user.email}`)
    console.log(`📊 Current organization: ${user.organization.name}`)
    console.log(`🎯 Current tier: ${user.organization.subscriptionTier}`)

    // Update organization to FOUNDER tier
    const updatedOrg = await prisma.organization.update({
      where: {
        id: user.organizationId
      },
      data: {
        subscriptionTier: 'FOUNDER',
        subscriptionStatus: 'ACTIVE'
      }
    })

    console.log('🎉 Successfully updated Oliver\'s organization to FOUNDER tier!')
    console.log(`📈 New tier: ${updatedOrg.subscriptionTier}`)
    console.log(`📊 Status: ${updatedOrg.subscriptionStatus}`)
    console.log('🚀 Oliver now has unlimited access to all features!')

  } catch (error) {
    console.error('❌ Error updating founder tier:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateFounderTier()
