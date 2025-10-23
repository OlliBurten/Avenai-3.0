/**
 * Quick RAG Smoke Test
 * 
 * Tests the RAG pipeline with a simple query
 */
import { hybridSearch } from "../lib/rag/search";
import { buildGroundedPrompt } from "../lib/chat/prompt";
import { prisma } from "../lib/prisma";

const ORG_ID = process.env.ORG_ID;
const DATASET_IDS = process.env.DATASET_IDS?.split(',').map(id => id.trim()) || [];

async function main() {
  let orgId = ORG_ID;
  
  // If no ORG_ID provided, try to find the first organization with documents
  if (!orgId) {
    console.log("🔍 No ORG_ID provided, finding first organization with documents...");
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
      console.log("💡 Please upload and process some documents first, or set ORG_ID environment variable");
      process.exit(1);
    }
    
    orgId = orgWithDocs.id;
    console.log(`✅ Found organization: ${orgWithDocs.name} (${orgWithDocs._count.documents} docs, ${orgWithDocs._count.datasets} datasets)`);
  }

  console.log("🧪 RAG Smoke Test");
  console.log(`Org ID: ${orgId}`);
  console.log(`Dataset IDs: ${DATASET_IDS.length > 0 ? DATASET_IDS.join(', ') : 'All'}`);
  console.log("");

  // Test context anchoring with three queries
  const queries = [
    "What is the Avenai Identity API?",
    "How do I integrate it?",
    "How do I integrate with Zignsec?"
  ];
  
  console.log(`\n🔍 Testing context anchoring with ${queries.length} queries`);
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n--- Query ${i + 1}: "${query}" ---`);
    
    try {
      // Run hybrid search
      const { results, debug } = await hybridSearch(query, {
        orgId: orgId,
        datasetIds: DATASET_IDS.length > 0 ? DATASET_IDS : undefined,
        topK: 24,
        preferDocIds: [], // TODO: implement session tracking
        topicHint: query.includes("Avenai") ? "Avenai Identity API" : 
                   query.includes("Zignsec") ? "Zignsec Mobile SDK" : ""
      });

      console.log("📊 Search Results:");
      console.log(`- Dense: ${debug.denseCount}`);
      console.log(`- Sparse: ${debug.sparseCount}`);
      console.log(`- Fused: ${debug.fusedCount}`);
      console.log(`- Re-ranked: ${debug.rerankedCount}`);
      console.log(`- Final: ${results.length}`);
      console.log("");

      if (results.length === 0) {
        console.log(`❌ No results found for query ${i + 1}`);
        continue;
      }

      // Show top 3 titles
      console.log("📄 Top 3 Documents:");
      results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. [${result.metadata.datasetId}] ${result.metadata.title}`);
      });
      
      // Assert brand consistency
      const topTitle = results[0]?.metadata?.title || "";
      const expectedBrand = query.includes("Avenai") ? "Avenai" : 
                           query.includes("Zignsec") ? "Zignsec" : "any";
      
      if (expectedBrand !== "any") {
        const hasExpectedBrand = topTitle.toLowerCase().includes(expectedBrand.toLowerCase());
        console.log(`${hasExpectedBrand ? "✅" : "❌"} Brand consistency: ${hasExpectedBrand ? "PASS" : "FAIL"} (expected ${expectedBrand}, got ${topTitle})`);
      }
      
      console.log("");
    } catch (error) {
      console.error(`❌ Error testing query ${i + 1}:`, error);
    }
  }
  
  console.log("✅ Context anchoring smoke test completed!");
}

main().catch(console.error);
