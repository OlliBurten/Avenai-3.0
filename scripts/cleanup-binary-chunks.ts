// scripts/cleanup-binary-chunks.ts
import { PrismaClient } from '@prisma/client';

// Ensure Node runtime
export const runtime = 'nodejs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding documents with binary PDF chunks...');
  
  // Find chunks that contain PDF binary data
  const badChunks = await prisma.documentChunk.findMany({
    where: { 
      content: { 
        startsWith: '%PDF-' 
      } 
    },
    select: { documentId: true }
  });

  const docIds = [...new Set(badChunks.map(c => c.documentId))];
  console.log(`📄 Found ${docIds.length} documents with binary chunks`);

  if (docIds.length === 0) {
    console.log('✅ No documents need cleanup');
    return;
  }

  for (const docId of docIds) {
    console.log(`🔧 Cleaning up document: ${docId}`);
    
    try {
      // Get document details
      const doc = await prisma.document.findUnique({ 
        where: { id: docId },
        select: { 
          id: true, 
          title: true, 
          organizationId: true, 
          datasetId: true,
          metadata: true
        }
      });
      
      if (!doc) {
        console.log(`❌ Document ${docId} not found, skipping`);
        continue;
      }

      // Purge all chunks for this document
      const deletedCount = await prisma.documentChunk.deleteMany({ 
        where: { documentId: docId } 
      });
      console.log(`🗑️ Deleted ${deletedCount.count} binary chunks`);

      // Mark document as failed with explanation
      await prisma.document.update({ 
        where: { id: docId }, 
        data: { 
          status: 'FAILED',
          metadata: {
            ...(doc.metadata as any || {}),
            cleanupReason: 'Binary PDF chunks detected',
            cleanupDate: new Date().toISOString(),
            note: 'Document needs to be re-uploaded for proper text extraction'
          }
        } 
      });

      console.log(`✅ Cleaned up document: ${doc.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to cleanup document ${docId}:`, error);
    }
  }

  console.log('🎉 Cleanup process completed');
  console.log('📝 Note: Affected documents need to be re-uploaded for proper text extraction');
}

main()
  .catch(e => {
    console.error('💥 Cleanup script failed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
