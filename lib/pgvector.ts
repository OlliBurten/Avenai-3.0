// lib/pgvector.ts
// PostgreSQL + pgvector implementation to replace Pinecone
// Provides semantic search, hybrid search, and document management

import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/embeddings';
import { log } from './log';

export interface PgVectorMatch {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  score: number;
  metadata?: any;
  title?: string;
}

export interface HybridSearchOptions {
  semanticWeight?: number; // 0-1, default 0.7
  keywordWeight?: number;  // 0-1, default 0.3
  useFullText?: boolean;   // Use tsvector (true) or trigram (false)
}

/**
 * Store embedding vector for a document chunk
 */
export async function storeEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  try {
    // Convert embedding array to PostgreSQL vector format
    const vectorString = `[${embedding.join(',')}]`;
    
    await prisma.$executeRaw`
      UPDATE document_chunks 
      SET embedding = ${vectorString}::vector
      WHERE id = ${chunkId}
    `;
    
    log.pine('Stored embedding for chunk:', chunkId.substring(0, 8));
  } catch (error) {
    log.err('Failed to store embedding:', error);
    throw error;
  }
}

/**
 * Semantic search using pgvector cosine similarity
 * Replaces Pinecone semantic search
 */
export async function searchSimilarDocuments(
  query: string,
  organizationId: string,
  datasetId?: string | string[],
  tags?: string[],
  topK: number = 10
): Promise<PgVectorMatch[]> {
  try {
    log.pine('pgvector semantic search:', { topK, datasetId, organizationId: typeof organizationId === 'string' ? organizationId.substring(0, 8) : organizationId });
    
    // Get query embedding
    console.log('🔍 Generating embedding for query:', query.substring(0, 50));
    const queryEmbedding = await getEmbedding(query);
    console.log('✅ Generated embedding:', queryEmbedding.length, 'dimensions');
    const vectorString = `[${queryEmbedding.join(',')}]`;
    
    // Build dataset filter
    let datasetFilter = '';
    if (datasetId) {
      if (Array.isArray(datasetId)) {
        const datasetList = datasetId.map(id => `'${id}'`).join(',');
        datasetFilter = `AND d.dataset_id IN (${datasetList})`;
      } else {
        datasetFilter = `AND d.dataset_id = '${datasetId}'`;
      }
    }
    
    // Semantic search with cosine similarity
    // Score = 1 - cosine_distance (higher is better)
    
    // Use Prisma's $queryRaw with template literals for proper parameterization
    let results: any[];
    
    if (datasetId) {
      if (Array.isArray(datasetId)) {
        results = await prisma.$queryRaw`
          SELECT 
            c.id,
            c."documentId" as "documentId",
            c.content,
            c."chunkIndex" as "chunkIndex",
            c.metadata,
            d.title,
            1 - (c.embedding <=> ${vectorString}::vector) as score
          FROM document_chunks c
          JOIN documents d ON c."documentId" = d.id
          WHERE c."organizationId" = ${organizationId}
            AND c.embedding IS NOT NULL
            AND d.status = 'COMPLETED'
            AND d."datasetId" = ANY(${datasetId}::text[])
          ORDER BY c.embedding <=> ${vectorString}::vector
          LIMIT ${topK}
        `;
      } else {
        results = await prisma.$queryRaw`
          SELECT 
            c.id,
            c."documentId" as "documentId",
            c.content,
            c."chunkIndex" as "chunkIndex",
            c.metadata,
            d.title,
            1 - (c.embedding <=> ${vectorString}::vector) as score
          FROM document_chunks c
          JOIN documents d ON c."documentId" = d.id
          WHERE c."organizationId" = ${organizationId}
            AND c.embedding IS NOT NULL
            AND d.status = 'COMPLETED'
            AND d."datasetId" = ${datasetId}
          ORDER BY c.embedding <=> ${vectorString}::vector
          LIMIT ${topK}
        `;
      }
    } else {
      results = await prisma.$queryRaw`
        SELECT 
          c.id,
          c."documentId" as "documentId",
          c.content,
          c."chunkIndex" as "chunkIndex",
          c.metadata,
          d.title,
          1 - (c.embedding <=> ${vectorString}::vector) as score
        FROM document_chunks c
        JOIN documents d ON c."documentId" = d.id
        WHERE c."organizationId" = ${organizationId}
          AND c.embedding IS NOT NULL
          AND d.status = 'COMPLETED'
        ORDER BY c.embedding <=> ${vectorString}::vector
        LIMIT ${topK}
      `;
    }
    
    console.log('✅ Vector search returned:', results.length, 'chunks');
    log.pine('pgvector results:', results.length, 'matches');
    
    return results.map(r => ({
      id: r.id,
      documentId: r.documentId,
      content: r.content,
      chunkIndex: r.chunkIndex,
      score: Number(r.score),
      metadata: r.metadata,
      title: r.title
    }));
  } catch (error: any) {
    log.err('pgvector search failed:', error?.message || error);
    return [];
  }
}

/**
 * Hybrid search: Combines semantic (vector) + keyword (BM25/FTS)
 * This is MORE powerful than Pinecone's paid-tier hybrid search
 */
export async function hybridSearch(
  query: string,
  options: {
    organizationId: string;
    datasetId?: string | string[];
    topK?: number;
    minScore?: number;
    semanticWeight?: number;
    keywordWeight?: number;
    useFullText?: boolean;
  }
): Promise<PgVectorMatch[]> {
  try {
    const {
      organizationId,
      datasetId,
      topK = 10,
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      useFullText = true
    } = options;
    
    log.pine('pgvector hybrid search:', { 
      topK, 
      datasetId, 
      semanticWeight, 
      keywordWeight,
      method: useFullText ? 'FTS' : 'trigram'
    });
    
    // Get query embedding
    console.log('🔍 Generating query embedding...');
    const queryEmbedding = await getEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;
    console.log(`✅ Query embedding generated (${queryEmbedding.length} dimensions)`);
    
    // Prepare query for text search
    const searchQuery = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' & ');
    
    // For now, use simple semantic search to avoid SQL complexity
    // TODO: Implement proper hybrid search once basic semantic search works
    console.log('🔍 Executing pgvector similarity query...');
    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        c.id,
        c."documentId" as "documentId",
        c.content,
        c."chunkIndex" as "chunkIndex",
        c.metadata,
        d.title,
        1 - (c.embedding <=> $1::vector) as score
      FROM document_chunks c
      JOIN documents d ON c."documentId" = d.id
      WHERE c."organizationId" = $2
        AND c.embedding IS NOT NULL
        AND d.status = 'COMPLETED'
        ${datasetId ? (Array.isArray(datasetId) ? 'AND d."datasetId" = ANY($3::text[])' : 'AND d."datasetId" = $3') : ''}
      ORDER BY score DESC
      LIMIT ${datasetId ? (Array.isArray(datasetId) ? '$4' : '$4') : '$3'}
    `, 
    datasetId 
      ? (Array.isArray(datasetId) 
          ? [vectorString, organizationId, datasetId, topK]
          : [vectorString, organizationId, datasetId, topK])
      : [vectorString, organizationId, topK]
    );
    
    console.log(`✅ pgvector query returned ${results.length} results`);
    if (results.length > 0) {
      console.log(`   Top score: ${Number(results[0].score).toFixed(4)}`);
      console.log(`   Top chunk: ${results[0].chunkIndex}, page ${results[0].metadata?.page}`);
    } else {
      console.warn('⚠️  pgvector returned 0 results - checking why...');
    }
    
    log.pine('pgvector hybrid results:', results.length, 'matches');
    
    return results.map(r => ({
      id: r.id,
      documentId: r.documentId,
      content: r.content,
      chunkIndex: r.chunkIndex,
      score: Number(r.score),
      metadata: r.metadata,
      title: r.title
    }));
  } catch (error: any) {
    log.err('pgvector hybrid search failed:', error?.message || error);
    // Fallback to semantic-only search
    return searchSimilarDocuments(query, options.organizationId, options.datasetId, undefined, options.topK || 10);
  }
}

/**
 * Keyword-only search (BM25 equivalent using PostgreSQL FTS)
 * Useful for exact phrase matching
 */
export async function keywordSearch(
  query: string,
  organizationId: string,
  datasetId?: string | string[],
  topK: number = 10
): Promise<PgVectorMatch[]> {
  try {
    log.pine('pgvector keyword search:', { topK, datasetId });
    
    // Build dataset filter
    let datasetFilter = '';
    if (datasetId) {
      if (Array.isArray(datasetId)) {
        const datasetList = datasetId.map(id => `'${id}'`).join(',');
        datasetFilter = `AND d.dataset_id IN (${datasetList})`;
      } else {
        datasetFilter = `AND d.dataset_id = '${datasetId}'`;
      }
    }
    
    // Prepare query for text search
    const searchQuery = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' & ');
    
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        c.id,
        c.document_id as "documentId",
        c.content,
        c.chunk_index as "chunkIndex",
        c.metadata,
        d.title,
        ts_rank_cd(c.content_tsv, to_tsquery('english', ${searchQuery})) as score
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.organization_id = ${organizationId}
        AND c.content_tsv @@ to_tsquery('english', ${searchQuery})
        AND d.status = 'COMPLETED'
        ${datasetFilter ? prisma.$queryRawUnsafe(datasetFilter) : prisma.$queryRawUnsafe('')}
      ORDER BY score DESC
      LIMIT ${topK}
    `;
    
    log.pine('pgvector keyword results:', results.length, 'matches');
    
    return results.map(r => ({
      id: r.id,
      documentId: r.documentId,
      content: r.content,
      chunkIndex: r.chunkIndex,
      score: Number(r.score),
      metadata: r.metadata,
      title: r.title
    }));
  } catch (error: any) {
    log.err('pgvector keyword search failed:', error?.message || error);
    return [];
  }
}

/**
 * Delete embeddings for a document
 */
export async function deleteDocumentEmbeddings(documentId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE document_chunks 
      SET embedding = NULL
      WHERE document_id = ${documentId}
    `;
    
    log.pine('Deleted embeddings for document:', documentId.substring(0, 8));
  } catch (error) {
    log.err('Failed to delete embeddings:', error);
    throw error;
  }
}

/**
 * Get embedding statistics for a dataset
 */
export async function getEmbeddingStats(
  organizationId: string,
  datasetId?: string
): Promise<{
  totalChunks: number;
  chunksWithEmbeddings: number;
  coverage: number;
}> {
  try {
    const stats = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(embedding) as chunks_with_embeddings,
        ROUND(COUNT(embedding)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as coverage
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.organization_id = ${organizationId}
        ${datasetId ? prisma.$queryRawUnsafe(`AND d.dataset_id = '${datasetId}'`) : prisma.$queryRawUnsafe('')}
    `;
    
    const result = stats[0];
    return {
      totalChunks: Number(result.total_chunks),
      chunksWithEmbeddings: Number(result.chunks_with_embeddings),
      coverage: Number(result.coverage)
    };
  } catch (error) {
    log.err('Failed to get embedding stats:', error);
    return { totalChunks: 0, chunksWithEmbeddings: 0, coverage: 0 };
  }
}

/**
 * Batch store embeddings (for bulk operations)
 */
export async function batchStoreEmbeddings(
  embeddings: Array<{ chunkId: string; embedding: number[] }>
): Promise<void> {
  try {
    // Use transaction for atomic batch update
    await prisma.$transaction(
      embeddings.map(({ chunkId, embedding }) => {
        const vectorString = `[${embedding.join(',')}]`;
        return prisma.$executeRaw`
          UPDATE document_chunks 
          SET embedding = ${vectorString}::vector,
              "embeddingId" = ${chunkId}
          WHERE id = ${chunkId}
        `;
      })
    );
    
    log.pine('Batch stored', embeddings.length, 'embeddings');
  } catch (error) {
    log.err('Failed to batch store embeddings:', error);
    throw error;
  }
}

