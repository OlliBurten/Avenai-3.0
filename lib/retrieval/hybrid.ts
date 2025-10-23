/**
 * Hybrid Retrieval System
 * Combines semantic (vector) + keyword (Postgres FTS) search for ChatGPT-level retrieval
 */

import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/embeddings';

export interface HybridSearchOptions {
  datasetId: string;
  organizationId: string;
  query: string;
  queryEmbedding?: number[]; // Optional pre-computed embedding
  topK?: number;
  vectorWeight?: number; // 0-1, how much to weight semantic search (default: 0.7)
  textWeight?: number;   // 0-1, how much to weight keyword search (default: 0.3)
  minScore?: number;     // Minimum fused score to include (default: 0.0)
}

export interface HybridResult {
  id: string;
  content: string;
  chunkIndex: number;
  sectionPath: string | null;
  documentId: string;
  documentTitle: string;
  metadata: any;
  page?: number;
  // Scoring
  fusedScore: number;
  vectorScore: number;
  textScore: number;
  // Debug info
  vectorRank?: number;
  textRank?: number;
  matchedTerms?: string[];
}

export type Candidate = {
  id: string;
  content: string;
  section_path: string | null;
  page: number | null;
  document_id: string;
  chunk_index: number;
  metadata: any;
  cosine: number;
  textScore: number;
  finalScore: number;
}

/**
 * Perform hybrid semantic + keyword search using Postgres FTS
 */
export async function hybridSearch(options: HybridSearchOptions): Promise<HybridResult[]> {
  const {
    datasetId,
    organizationId,
    query,
    queryEmbedding: providedEmbedding,
    topK = 10,
    vectorWeight = 0.7,
    textWeight = 0.3,
    minScore = 0.0
  } = options;

  console.log(`🔍 [Hybrid Search] Query: "${query}"`);
  console.log(`⚖️ [Hybrid Search] Weights: Vector=${vectorWeight}, Text=${textWeight}`);

  // Get query embedding
  const queryEmbedding = providedEmbedding || await getEmbedding(query);
  
  const k = topK * 4; // Retrieve more candidates for MMR diversity

  // Step 1: Vector search (semantic similarity)
  const vectorRows = await prisma.$queryRaw<Candidate[]>`
    SELECT 
      dc.id,
      dc.content,
      dc.section_path,
      (dc.metadata->>'page')::int as page,
      dc.document_id,
      dc.chunk_index,
      dc.metadata,
      (1 - (dc.embedding <=> ${queryEmbedding}::vector)) AS cosine,
      0.0::float AS "textScore",
      0.0::float AS "finalScore"
    FROM document_chunks dc
    INNER JOIN documents d ON dc.document_id = d.id
    WHERE dc.organization_id = ${organizationId}::uuid
      AND d.dataset_id = ${datasetId}::uuid
      AND d.status = 'READY'
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${k}
  `;

  console.log(`🎯 [Hybrid Search] Vector: Retrieved ${vectorRows.length}, top score=${vectorRows[0]?.cosine.toFixed(4) || 'N/A'}`);

  // Step 2: Text search (Postgres FTS with ts_rank_cd)
  const textRows = await prisma.$queryRaw<Candidate[]>`
    SELECT 
      dc.id,
      dc.content,
      dc.section_path,
      (dc.metadata->>'page')::int as page,
      dc.document_id,
      dc.chunk_index,
      dc.metadata,
      0.0::float AS cosine,
      ts_rank_cd(dc.fts, plainto_tsquery('simple', ${query})) AS "textScore",
      0.0::float AS "finalScore"
    FROM document_chunks dc
    INNER JOIN documents d ON dc.document_id = d.id
    WHERE dc.organization_id = ${organizationId}::uuid
      AND d.dataset_id = ${datasetId}::uuid
      AND d.status = 'READY'
      AND dc.fts @@ plainto_tsquery('simple', ${query})
    ORDER BY "textScore" DESC
    LIMIT ${k}
  `;

  console.log(`🔑 [Hybrid Search] Text: Retrieved ${textRows.length}, top score=${textRows[0]?.textScore.toFixed(4) || 'N/A'}`);

  // Step 3: Fuse results (merge by ID, combine scores)
  const candidateMap = new Map<string, Candidate>();
  
  for (const r of vectorRows) {
    candidateMap.set(r.id, r);
  }
  
  for (const t of textRows) {
    const existing = candidateMap.get(t.id);
    if (existing) {
      // Already in map from vector search, update text score
      existing.textScore = Math.max(existing.textScore, t.textScore);
    } else {
      // New from text search, add it
      candidateMap.set(t.id, t);
    }
  }

  // Step 4: Calculate final scores
  const fusedCandidates = Array.from(candidateMap.values()).map(r => ({
    ...r,
    finalScore: vectorWeight * (r.cosine || 0) + textWeight * (r.textScore || 0),
  }));

  // Sort by final score
  fusedCandidates.sort((a, b) => b.finalScore - a.finalScore);

  console.log(`🔀 [Hybrid Search] Fused: ${fusedCandidates.length} unique candidates`);

  // Step 5: Get document titles and map to HybridResult format
  const chunkIds = fusedCandidates.map(c => c.id);
  const documentsMap = new Map<string, string>();
  
  const chunks = await prisma.documentChunk.findMany({
    where: { id: { in: chunkIds } },
    select: {
      id: true,
      document: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
  
  for (const chunk of chunks) {
    documentsMap.set(chunk.id, chunk.document.title);
  }

  // Step 6: Map to HybridResult and apply filters
  const finalResults: HybridResult[] = fusedCandidates
    .filter(c => c.finalScore >= minScore)
    .slice(0, topK)
    .map((c, idx) => ({
      id: c.id,
      content: c.content,
      chunkIndex: c.chunk_index,
      sectionPath: c.section_path,
      documentId: c.document_id,
      documentTitle: documentsMap.get(c.id) || 'Unknown',
      metadata: c.metadata,
      page: c.page || undefined,
      fusedScore: c.finalScore,
      vectorScore: c.cosine || 0,
      textScore: c.textScore || 0,
      vectorRank: vectorRows.findIndex(v => v.id === c.id) + 1 || undefined,
      textRank: textRows.findIndex(t => t.id === c.id) + 1 || undefined,
    }));

  console.log(`✅ [Hybrid Search] Final: ${finalResults.length} results (minScore=${minScore})`);
  
  // Log top 3 for debugging
  finalResults.slice(0, 3).forEach((r, idx) => {
    console.log(`   ${idx + 1}. Chunk ${r.chunkIndex} | Fused=${r.fusedScore.toFixed(4)} (V=${r.vectorScore.toFixed(4)} T=${r.textScore.toFixed(4)})`);
  });

  return finalResults;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Query expansion - expand query with synonyms and related terms
 * This helps BM25 find relevant chunks even with different wording
 */
export function expandQuery(query: string): string {
  const expansions: Record<string, string[]> = {
    'auth': ['authentication', 'authorization', 'credentials', 'login'],
    'authentication': ['auth', 'authorization', 'credentials', 'login'],
    'header': ['headers', 'http header', 'request header'],
    'endpoint': ['endpoints', 'api', 'url', 'route'],
    'error': ['errors', 'error code', 'exception', 'failure'],
    'sdk': ['library', 'framework', 'package', 'module'],
    'mobile': ['android', 'ios', 'app'],
    'bankid': ['bank id', 'bank-id'],
  };
  
  const terms = query.toLowerCase().split(/\s+/);
  const expanded = new Set(terms);
  
  for (const term of terms) {
    const synonyms = expansions[term];
    if (synonyms) {
      synonyms.forEach(syn => expanded.add(syn));
    }
  }
  
  return Array.from(expanded).join(' ');
}

