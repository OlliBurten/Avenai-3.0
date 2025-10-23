#!/usr/bin/env node

/**
 * Cleanup script to permanently delete soft-deleted datasets
 * This resolves unique constraint conflicts when trying to create datasets with the same name
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupSoftDeletedDatasets() {
  try {
    console.log('🔍 Finding soft-deleted datasets...')
    
    // Find all soft-deleted datasets
    const softDeletedDatasets = await prisma.dataset.findMany({
      where: {
        isActive: false
      },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      }
    })

    console.log(`📊 Found ${softDeletedDatasets.length} soft-deleted datasets`)

    if (softDeletedDatasets.length === 0) {
      console.log('✅ No soft-deleted datasets to clean up')
      return
    }

    // Show what will be deleted
    console.log('\n📋 Soft-deleted datasets to be permanently removed:')
    softDeletedDatasets.forEach(dataset => {
      console.log(`  - ${dataset.name} (${dataset._count.documents} documents) - Created: ${dataset.createdAt.toISOString()}`)
    })

    // Ask for confirmation
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      rl.question('\n❓ Do you want to permanently delete these datasets? (y/N): ', resolve)
    })

    rl.close()

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled')
      return
    }

    console.log('\n🗑️  Permanently deleting soft-deleted datasets...')

    // Delete documents first (cascade should handle this, but being explicit)
    for (const dataset of softDeletedDatasets) {
      await prisma.document.deleteMany({
        where: {
          datasetId: dataset.id
        }
      })
    }

    // Delete the datasets
    const deleteResult = await prisma.dataset.deleteMany({
      where: {
        isActive: false
      }
    })

    console.log(`✅ Successfully deleted ${deleteResult.count} soft-deleted datasets`)
    console.log('🎉 Cleanup completed! You can now create datasets with previously used names.')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupSoftDeletedDatasets()
