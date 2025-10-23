#!/usr/bin/env tsx
/**
 * Seed test data in EU production database
 * Creates a test organization and user for local testing
 */
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function seedEUDatabase() {
  console.log('🌍 Seeding EU Production Database with test data...')
  console.log('')

  try {
    // 1. Create test organization
    console.log('📊 Creating test organization...')
    const org = await prisma.organization.upsert({
      where: { id: 'eu-test-org' },
      update: {},
      create: {
        id: 'eu-test-org',
        name: 'Avenai EU Test Organization',
        slug: 'avenai-eu-test',
        subscriptionTier: 'PRO',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    console.log(`✅ Organization created: ${org.name} (${org.id})`)
    console.log('')

    // 2. Create test user
    console.log('👤 Creating test user...')
    const passwordHash = await hash('password123', 10)
    
    const user = await prisma.user.upsert({
      where: { email: 'test@avenai.io' },
      update: {
        passwordHash,
        organizationId: org.id,
      },
      create: {
        email: 'test@avenai.io',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        organizationId: org.id,
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    })
    console.log(`✅ User created: ${user.email} (${user.id})`)
    console.log('')

    // 3. Create test dataset
    console.log('📁 Creating test dataset...')
    const dataset = await prisma.dataset.upsert({
      where: { id: 'eu-test-dataset' },
      update: {},
      create: {
        id: 'eu-test-dataset',
        name: 'EU Test Dataset',
        description: 'Testing EU database with ZignSec documentation',
        organizationId: org.id,
        type: 'DOCUMENTATION',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    console.log(`✅ Dataset created: ${dataset.name} (${dataset.id})`)
    console.log('')

    // 4. Summary
    console.log('🎉 EU Database seeded successfully!')
    console.log('')
    console.log('📋 Test Credentials:')
    console.log('   Email: test@avenai.io')
    console.log('   Password: password123')
    console.log('   Organization: Avenai EU Test Organization')
    console.log('   Dataset: EU Test Dataset')
    console.log('')
    console.log('🔗 Connection:')
    console.log(`   Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'EU Frankfurt'}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedEUDatabase()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

