#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteUser(email: string) {
  try {
    console.log(`🗑️  Deleting user: ${email}`)
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            org: true
          }
        }
      }
    })

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`)
    console.log(`🏢 Organizations: ${user.memberships.length}`)

    // Delete memberships first
    for (const membership of user.memberships) {
      console.log(`  - Deleting membership in: ${membership.org.name}`)
      await prisma.membership.delete({
        where: { id: membership.id }
      })
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: user.id }
    })

    console.log(`✅ Successfully deleted user: ${email}`)
    
  } catch (error) {
    console.error('❌ Error deleting user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line args
const email = process.argv[2]
if (!email) {
  console.log('Usage: tsx scripts/delete-user.ts <email>')
  process.exit(1)
}

deleteUser(email)
