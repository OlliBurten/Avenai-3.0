/**
 * Debug RAG Pipeline
 * 
 * Debug the RAG pipeline step by step
 */
import { prisma } from "../lib/prisma";
import { getEmbedding } from "../lib/embeddings";
import { searchSimilarDocuments } from "../lib/pgvector";

async function main() {
  console.log("🔍 Debugging RAG pipeline...");
  
  const orgId = "cmfgwxvrf0011sguminmi0s36";
  const query = "What docs do you have access to?";
  
  console.log(`Query: "${query}"`);
  console.log(`Org ID: ${orgId}`);
  console.log("");
  
  // Step 1: Generate query embedding
  console.log("1️⃣ Generating query embedding...");
  const queryEmbedding = await getEmbedding(query);
  console.log(`✅ Query embedding: ${queryEmbedding.length} dimensions`);
  
  // Step 2: Search Pinecone
  console.log("\n2️⃣ Searching Pinecone...");
  const index = pinecone();
  if (!index) {
    console.error("❌ Pinecone index not available");
    return;
  }
  
  const pineconeResults = await index.query({
    vector: queryEmbedding,
    topK: 60,
    includeMetadata: true,
    filter: { orgId: { $eq: orgId } }
  });
  
  console.log(`✅ Pinecone returned ${pineconeResults.matches?.length || 0} results`);
  
  if (pineconeResults.matches && pineconeResults.matches.length > 0) {
    console.log("\n📄 Top 5 Pinecone results:");
    pineconeResults.matches.slice(0, 5).forEach((match, i) => {
      console.log(`${i + 1}. ${match.id} (score: ${match.score?.toFixed(3)}) - ${(match.metadata as any)?.title || 'No title'}`);
    });
    
    // Step 3: Fetch chunk payloads
    console.log("\n3️⃣ Fetching chunk payloads...");
    const chunkIds = pineconeResults.matches.slice(0, 40).map(m => m.id);
    console.log(`Fetching ${chunkIds.length} chunks...`);
    
    const chunks = await prisma.documentChunk.findMany({
      where: {
        id: { in: chunkIds },
        organizationId: orgId
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            datasetId: true
          }
        }
      }
    });
    
    console.log(`✅ Found ${chunks.length} chunks in database`);
    
    if (chunks.length > 0) {
      console.log("\n📝 Sample chunks:");
      chunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`${i + 1}. [${chunk.document?.title || 'No title'}] ${chunk.content.substring(0, 100)}... (${chunk.content.length} chars)`);
      });
      
      // Step 4: Check rerank candidates
      console.log("\n4️⃣ Preparing rerank candidates...");
      const rerankCandidates = chunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        metadata: {
          title: chunk.document?.title || "Untitled",
          datasetId: chunk.document?.datasetId || "default",
          docId: chunk.documentId
        },
        score: pineconeResults.matches?.find(m => m.id === chunk.id)?.score || 0
      }));
      
      console.log(`✅ Prepared ${rerankCandidates.length} rerank candidates`);
      console.log("\n🎯 Sample rerank candidates:");
      rerankCandidates.slice(0, 3).forEach((candidate, i) => {
        console.log(`${i + 1}. [${candidate.metadata.title}] Score: ${candidate.score.toFixed(3)}`);
        console.log(`   Content: ${candidate.content.substring(0, 150)}...`);
      });
    }
  }
}

main().catch(console.error);
