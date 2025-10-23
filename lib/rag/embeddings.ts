/**
 * Embeddings Integration for UDoc Pipeline
 * 
 * Handles vector embedding generation and storage for the universal document format.
 * Integrates with pgvector database and OpenAI embeddings.
 */

import { chunkMarkdown } from "./chunking";
import { getEmbedding } from "../embeddings";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

type SearchArgs = {
  namespace: string;          // orgId
  datasetIds: string[];       // ALL selected datasets
  vector: number[];
  topK?: number;
};

export async function indexUDoc(docId: string, udoc: { md: string }, orgId: string, datasetId?: string) {
  // Hard guard: fail fast if missing orgId
  if (!orgId) {
    console.error("RAG: missing orgId in indexUDoc");
    throw new Error("Missing orgId");
  }
  
  const chunks = chunkMarkdown(udoc.md, 800);
  
  // Generate embeddings for all chunks
  const vectors = await embed(chunks.map(c => c.content));
  
  // Store embeddings in pgvector (replaces Pinecone)
  let embedded = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      await prisma.documentChunk.create({
        data: {
          id: `${docId}:${i}`,
          documentId: docId,
          organizationId: orgId,
          datasetId: datasetId || "default",
          chunkIndex: i,
          content: chunks[i].content,
          metadata: {
            source: "udoc-pipeline",
            path: `${orgId}/${datasetId || "default"}/${docId}`,
            title: chunks[i].meta?.title || "Untitled",
            content: chunks[i].content.substring(0, 1000) // Store first 1000 chars for debugging
          },
          embedding: vectors[i] as any // Store as vector type
        }
      });
      embedded++;
    } catch (error) {
      console.error(`Failed to store chunk ${i}:`, error);
    }
  }
  
  return embedded;
}

/**
 * Generate embeddings using OpenAI
 */
async function embed(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    
    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error("Failed to generate embeddings");
  }
}

/**
 * Semantic search with proper namespace and dataset filtering
 */
export async function semanticSearch({ namespace, datasetIds, vector, topK = 12 }: SearchArgs) {
  // LOG to verify in prod
  console.log("🔎 pgvector.search", { namespace, datasetIds, topK });

  try {
    // Use pgvector search instead of Pinecone
    const results = await prisma.$queryRaw`
      SELECT 
        c.id,
        c."documentId" as "documentId",
        c.content,
        c."chunkIndex" as "chunkIndex",
        c.metadata,
        d.title,
        1 - (c.embedding <=> ${vector}::vector) as score
      FROM document_chunks c
      JOIN documents d ON c."documentId" = d.id
      WHERE c."organizationId" = ${namespace}
        AND c.embedding IS NOT NULL
        AND d.status = 'COMPLETED'
        ${datasetIds && datasetIds.length > 0 ? 
          Prisma.sql`AND c."datasetId" = ANY(${datasetIds})` : 
          Prisma.empty
        }
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${topK}
    `;

    return (results as any[]).map((result: any) => ({
      id: result.id,
      score: result.score,
      metadata: {
        ...result.metadata,
        organizationId: namespace,
        datasetId: result.datasetId,
        documentId: result.documentId,
        title: result.title
      }
    }));
  } catch (error) {
    console.error('pgvector search failed:', error);
    return [];
  }
}

/**
 * Search for similar documents (legacy function for backward compatibility)
 */
export async function searchSimilarDocuments(
  query: string,
  organizationId: string,
  datasetIds?: string | string[],
  limit: number = 10
): Promise<Array<{ id: string; score: number; metadata: any }>> {
  try {
    // Generate embedding for query
    const queryEmbedding = await embed([query]);
    
    // Convert single datasetId to array
    const searchDatasetIds = Array.isArray(datasetIds) ? datasetIds : (datasetIds ? [datasetIds] : []);
    
    // Use new semantic search function
    const matches = await semanticSearch({
      namespace: organizationId,
      datasetIds: searchDatasetIds,
      vector: queryEmbedding[0],
      topK: limit
    });
    
    return matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata || {}
    }));
    
  } catch (error) {
    console.error("Vector search failed:", error);
    throw new Error("Failed to search similar documents");
  }
}

/**
 * Delete document vectors from pgvector
 */
export async function deleteDocumentVectors(docId: string): Promise<void> {
  try {
    // Delete all chunks for this document from pgvector
    await prisma.documentChunk.deleteMany({
      where: {
        documentId: docId
      }
    });
    
  } catch (error) {
    console.error("Vector deletion failed:", error);
    throw new Error("Failed to delete document vectors");
  }
}

/**
 * Update document vectors (delete old, add new)
 */
export async function updateDocumentVectors(
  docId: string, 
  udoc: { md: string },
  orgId: string,
  datasetId?: string
): Promise<number> {
  // Delete existing vectors
  await deleteDocumentVectors(docId);
  
  // Index new vectors
  return await indexUDoc(docId, udoc, orgId, datasetId);
}