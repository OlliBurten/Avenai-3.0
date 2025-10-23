#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

async function cleanupDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧹 Starting database cleanup...')
    
    // 1. Delete all document chunks
    const deletedChunks = await prisma.documentChunk.deleteMany({})
    console.log(`✅ Deleted ${deletedChunks.count} document chunks`)
    
    // 2. Delete all documents
    const deletedDocuments = await prisma.document.deleteMany({})
    console.log(`✅ Deleted ${deletedDocuments.count} documents`)
    
    // 3. Delete all chat sessions and messages
    const deletedMessages = await prisma.chatMessage.deleteMany({})
    console.log(`✅ Deleted ${deletedMessages.count} chat messages`)
    
    const deletedSessions = await prisma.chatSession.deleteMany({})
    console.log(`✅ Deleted ${deletedSessions.count} chat sessions`)
    
    // 4. Delete all document shares
    const deletedShares = await prisma.documentShare.deleteMany({})
    console.log(`✅ Deleted ${deletedShares.count} document shares`)
    
    // 5. Delete all collaboration sessions
    const deletedCollaborations = await prisma.collaborationSession.deleteMany({})
    console.log(`✅ Deleted ${deletedCollaborations.count} collaboration sessions`)
    
    // 6. Delete all analytics events
    const deletedAnalytics = await prisma.analyticsEvent.deleteMany({})
    console.log(`✅ Deleted ${deletedAnalytics.count} analytics events`)
    
    console.log('✅ Database cleanup completed successfully!')
    console.log('🎯 Database is now clean and ready for fresh PDF uploads!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDatabase()
