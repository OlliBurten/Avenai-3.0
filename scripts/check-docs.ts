/**
 * Check Documents and Chunks
 * 
 * Checks the status of documents and their chunks
 */
import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔍 Checking documents and chunks...");
  
  // Find organizations with documents
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          documents: true,
          documentChunks: true
        }
      }
    }
  });

  console.log("\n📊 Organizations:");
  orgs.forEach(org => {
    console.log(`- ${org.name} (${org.id}): ${org._count.documents} docs, ${org._count.documentChunks} chunks`);
  });

  if (orgs.length === 0) {
    console.log("❌ No organizations found");
    return;
  }

  // Find the first org with documents
  const orgWithDocs = orgs.find(org => org._count.documents > 0) || orgs[0];
  console.log(`\n📄 Documents for ${orgWithDocs.name}:`);
  
  const documents = await prisma.document.findMany({
    where: {
      organizationId: orgWithDocs.id
    },
    include: {
      _count: {
        select: {
          documentChunks: true
        }
      },
      dataset: {
        select: {
          name: true
        }
      }
    }
  });

  documents.forEach(doc => {
    console.log(`- ${doc.title} (${doc.status}): ${doc._count.documentChunks} chunks [${doc.dataset?.name || 'No dataset'}]`);
  });

  // Check chunks with embeddings
  const chunksWithEmbeddings = await prisma.documentChunk.count({
    where: {
      organizationId: orgWithDocs.id,
      embeddingId: {
        not: null
      }
    }
  });

  const totalChunks = await prisma.documentChunk.count({
    where: {
      organizationId: orgWithDocs.id
    }
  });

  console.log(`\n🧩 Chunks: ${totalChunks} total, ${chunksWithEmbeddings} with embeddings`);

  // Sample a few chunks to see their content
  const sampleChunks = await prisma.documentChunk.findMany({
    where: {
      organizationId: orgWithDocs.id
    },
    take: 3,
    include: {
      document: {
        select: {
          title: true
        }
      }
    }
  });

  console.log("\n📝 Sample chunks:");
  sampleChunks.forEach((chunk, i) => {
    console.log(`${i + 1}. [${chunk.document.title}] ${chunk.content.substring(0, 100)}... (${chunk.content.length} chars, embeddingId: ${chunk.embeddingId || 'none'})`);
  });
}

main().catch(console.error);