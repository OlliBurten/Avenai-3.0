/**
 * Direct Embedding Rebuild Script
 * 
 * Rebuilds embeddings directly without API calls
 */
import { prisma } from "../lib/prisma";
import { getEmbedding } from "../lib/embeddings";
// Note: This script needs to be updated to use pgvector instead of Pinecone

async function main() {
  console.log("🔄 Rebuilding embeddings directly...");
  
  // Get all chunks without embeddings (limit to 200 for this run)
  const chunks = await prisma.documentChunk.findMany({
    where: {
      embeddingId: null
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          organizationId: true,
          datasetId: true
        }
      }
    },
    take: 200 // Process in batches
  });

  console.log(`Found ${chunks.length} chunks without embeddings`);

  if (chunks.length === 0) {
    console.log("✅ All chunks already have embeddings");
    return;
  }

  const index = pinecone();
  if (!index) {
    console.error("❌ Pinecone index not available");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const chunk of chunks) {
    try {
      console.log(`🔄 Processing chunk ${chunk.id} from "${chunk.document.title}"`);
      
      // Generate embedding
      const embedding = await getEmbedding(chunk.content);
      
      // Create unique ID for Pinecone
      const embeddingId = `chunk-${chunk.id}`;
      
      // Upsert to Pinecone
      await index.upsert([{
        id: embeddingId,
        values: embedding,
        metadata: {
          orgId: chunk.document.organizationId,
          datasetId: chunk.document.datasetId || 'default',
          docId: chunk.document.id,
          chunkIndex: chunk.chunkIndex,
          title: chunk.document.title,
          content: chunk.content.substring(0, 1000) // Limit metadata size
        }
      }]);

      // Update chunk with embedding ID
      await prisma.documentChunk.update({
        where: { id: chunk.id },
        data: { embeddingId }
      });

      successCount++;
      console.log(`✅ Success: ${chunk.id}`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing chunk ${chunk.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Rebuild complete: ${successCount} success, ${errorCount} errors`);
}

main().catch(console.error);
