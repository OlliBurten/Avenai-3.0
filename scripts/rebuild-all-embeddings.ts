/**
 * Rebuild All Embeddings Script
 * 
 * Rebuilds embeddings for all documents to ensure proper metadata and vectors
 */
import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔄 Rebuilding all embeddings...");
  console.log("=".repeat(50));
  
  // Load all documents that aren't deleted
  const documents = await prisma.document.findMany({
    where: {
      status: { not: 'FAILED' }
    },
    select: {
      id: true,
      title: true,
      organizationId: true,
      datasetId: true,
      status: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${documents.length} documents to rebuild`);
  console.log("");
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const doc of documents) {
    try {
      console.log(`🔄 Rebuilding: ${doc.title} (${doc.id})`);
      
      const response = await fetch('http://localhost:3000/api/embeddings/rebuild', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `organizationId=${doc.organizationId}` // Simulate session
        },
        body: JSON.stringify({ documentId: doc.id })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Success: ${result.chunkCount} chunks, ${result.embedded} embedded`);
        successCount++;
      } else {
        console.log(`❌ Failed: ${result.error}`);
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }
  
  console.log("");
  console.log("=".repeat(50));
  console.log(`✅ Rebuild complete: ${successCount} success, ${errorCount} errors`);
}

main().catch(console.error);
