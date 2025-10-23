#!/usr/bin/env node

/**
 * Setup Founder User Script
 * Creates the founder user (oliver@avenai.io) with SUPER_ADMIN role
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setupFounder() {
  try {
    console.log('🚀 Setting up founder user...')

    // Check if founder already exists
    const existingFounder = await prisma.user.findFirst({
      where: {
        email: 'oliver@avenai.io'
      }
    })

    if (existingFounder) {
      console.log('✅ Founder user already exists, updating role to SUPER_ADMIN...')
      
      await prisma.user.update({
        where: { id: existingFounder.id },
        data: { 
          role: 'SUPER_ADMIN',
          emailVerified: true,
          isActive: true
        }
      })
      
      console.log('✅ Founder user updated successfully!')
      return
    }

    // Create founder organization (Avenai Internal)
    const founderOrg = await prisma.organization.upsert({
      where: { slug: 'avenai-internal' },
      update: {},
      create: {
        name: 'Avenai Internal',
        slug: 'avenai-internal',
        subscriptionTier: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        settings: {
          isInternal: true,
          founderOrg: true
        }
      }
    })

    console.log('✅ Founder organization created:', founderOrg.name)

    // Hash password
    const passwordHash = await bcrypt.hash('Avenai2024!', 12)

    // Create founder user
    const founderUser = await prisma.user.create({
      data: {
        organizationId: founderOrg.id,
        email: 'oliver@avenai.io',
        passwordHash,
        firstName: 'Oliver',
        lastName: 'Harburt',
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isActive: true
      }
    })

    console.log('✅ Founder user created successfully!')
    console.log('📧 Email:', founderUser.email)
    console.log('🔑 Password: Avenai2024!')
    console.log('👑 Role: SUPER_ADMIN')
    console.log('🏢 Organization:', founderOrg.name)

  } catch (error) {
    console.error('❌ Error setting up founder user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupFounder()
