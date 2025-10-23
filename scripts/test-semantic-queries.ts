/**
 * Test Semantic Mismatch Queries
 * 
 * Tests RAG with queries phrased differently than the documents
 */
import { hybridSearch } from "../lib/rag/search";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("🧪 Testing Semantic Mismatch Queries");
  console.log("=".repeat(50));
  
  // Find organization with documents
  const orgWithDocs = await prisma.organization.findFirst({
    where: {
      documents: {
        some: {
          status: 'COMPLETED'
        }
      }
    },
    include: {
      _count: {
        select: {
          documents: true,
          datasets: true
        }
      }
    }
  });
  
  if (!orgWithDocs) {
    console.error("❌ No organizations with completed documents found");
    return;
  }
  
  console.log(`Organization: ${orgWithDocs.name} (${orgWithDocs._count.documents} docs, ${orgWithDocs._count.datasets} datasets)`);
  console.log("");
  
  // Test queries that are phrased differently than the documents
  const testQueries = [
    "What authentication methods are available?",
    "How do I integrate with mobile apps?", 
    "What are the API endpoints for user verification?",
    "Tell me about the SDK documentation",
    "How does the BankID integration work?",
    "What are the security features?"
  ];
  
  for (const query of testQueries) {
    console.log(`🔍 Query: "${query}"`);
    
    try {
      const { results, debug } = await hybridSearch(query, {
        orgId: orgWithDocs.id,
        topK: 24
      });
      
      console.log(`📊 Results: dense=${debug.denseCount} sparse=${debug.sparseCount} fused=${debug.fusedCount} reranked=${debug.rerankedCount} final=${results.length}`);
      
      if (results.length > 0) {
        console.log("📄 Top 3 results:");
        results.slice(0, 3).forEach((result, i) => {
          console.log(`  ${i + 1}. [${result.metadata.datasetId}] ${result.metadata.title} (score: ${result.score.toFixed(3)})`);
        });
      } else {
        console.log("❌ No results found");
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log("");
  }
  
  console.log("✅ Semantic mismatch testing completed!");
}

main().catch(console.error);
