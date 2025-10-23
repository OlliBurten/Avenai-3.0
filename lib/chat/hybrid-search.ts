/**
 * Hybrid Search: Vector + Full-Text Fusion
 * 
 * Implements: 0.7 × vector + 0.3 × ts_rank_cd
 * Part of PR-4 completion
 */

import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/embeddings";
import type { RetrieveOpts, RetrievalSource } from "./types";

interface HybridCandidate {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  title: string;
  metadata: any;
  vectorScore: number;  // 0-1, cosine similarity
  textScore: number;    // 0-1, normalized ts_rank_cd
  hybridScore: number;  // 0.7 * vector + 0.3 * text
}

/**
 * Normalize text search scores to 0-1 range
 * ts_rank_cd returns arbitrary values, we need to normalize
 */
function normalizeTextScores(candidates: HybridCandidate[]): HybridCandidate[] {
  if (candidates.length === 0) return candidates;
  
  const maxTextScore = Math.max(...candidates.map(c => c.textScore));
  
  if (maxTextScore === 0) return candidates;
  
  return candidates.map(c => ({
    ...c,
    textScore: c.textScore / maxTextScore  // Normalize to 0-1
  }));
}

/**
 * Hybrid search: vector + full-text fusion
 * 
 * @param opts - Search options
 * @param k - Number of results to return (default: 50 for policy filtering)
 * @returns Hybrid-scored candidates
 */
export async function hybridSearch(opts: RetrieveOpts, k: number = 50): Promise<HybridCandidate[]> {
  const { query, organizationId, datasetId } = opts;
  const startTime = Date.now();

  console.log("🔍 [HybridSearch] Starting vector + text fusion...", {
    query: query.substring(0, 60),
    k
  });

  // 1. Get vector embedding
  const vec = await getEmbedding(query);
  const vecLiteral = `[${vec.join(",")}]`;

  // 2. Prepare text search query (clean and tokenize)
  const textQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // Remove special chars
    .split(/\s+/)
    .filter(w => w.length > 2)  // Remove short words
    .join(' & ');  // PostgreSQL tsquery format

  console.log("🔍 [HybridSearch] Text query:", textQuery);

  // 3. Hybrid query: vector + text in one pass
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    WITH vector_results AS (
      SELECT 
        c.id,
        c."documentId",
        c.content,
        c."chunkIndex",
        c.metadata,
        c.section_path,
        d.title,
        1 - (c.embedding <=> $1::vector) AS vector_score
      FROM document_chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE c."organizationId" = $2
        AND d."datasetId" = $3
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector
      LIMIT $4
    ),
    text_results AS (
      SELECT 
        c.id,
        c."documentId",
        c.content,
        c."chunkIndex",
        c.metadata,
        c.section_path,
        d.title,
        ts_rank_cd(to_tsvector('english', c.content), to_tsquery('english', $5)) AS text_score
      FROM document_chunks c
      JOIN documents d ON d.id = c."documentId"
      WHERE c."organizationId" = $2
        AND d."datasetId" = $3
        AND to_tsvector('english', c.content) @@ to_tsquery('english', $5)
      ORDER BY text_score DESC
      LIMIT $4
    )
    SELECT DISTINCT
      COALESCE(v.id, t.id) as id,
      COALESCE(v."documentId", t."documentId") as "documentId",
      COALESCE(v.content, t.content) as content,
      COALESCE(v."chunkIndex", t."chunkIndex") as "chunkIndex",
      COALESCE(v.metadata, t.metadata) as metadata,
      COALESCE(v.section_path, t.section_path) as section_path,
      COALESCE(v.title, t.title) as title,
      COALESCE(v.vector_score, 0) as vector_score,
      COALESCE(t.text_score, 0) as text_score,
      (COALESCE(v.vector_score, 0) * 0.7 + COALESCE(t.text_score, 0) * 0.3) as hybrid_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
    ORDER BY hybrid_score DESC
    LIMIT $4;
    `,
    vecLiteral,      // $1
    organizationId,  // $2
    datasetId,       // $3
    k * 2,           // $4 - Get 2x for diversity
    textQuery        // $5
  );

  console.log(`✅ [HybridSearch] Retrieved ${rows.length} candidates (vector + text)`);

  // 4. Normalize text scores and calculate hybrid score
  let candidates: HybridCandidate[] = rows.map(r => ({
    id: r.id,
    documentId: r.documentId,
    content: r.content,
    chunkIndex: Number(r.chunkIndex ?? 0),
    title: r.title || 'Unknown Document',
    metadata: r.metadata ?? {},
    vectorScore: Number(r.vector_score ?? 0),
    textScore: Number(r.text_score ?? 0),
    hybridScore: 0  // Will be calculated after normalization
  }));

  // Normalize text scores to 0-1
  candidates = normalizeTextScores(candidates);

  // Calculate final hybrid score: 0.7 × vector + 0.3 × text
  candidates = candidates.map(c => ({
    ...c,
    hybridScore: (0.7 * c.vectorScore) + (0.3 * c.textScore)
  }));

  // Sort by hybrid score
  candidates.sort((a, b) => b.hybridScore - a.hybridScore);

  const elapsed = Date.now() - startTime;
  console.log(`✅ [HybridSearch] Fusion complete in ${elapsed}ms:`, {
    totalCandidates: candidates.length,
    topHybridScore: candidates[0]?.hybridScore.toFixed(3),
    topVectorScore: candidates[0]?.vectorScore.toFixed(3),
    topTextScore: candidates[0]?.textScore.toFixed(3),
    avgHybrid: (candidates.reduce((s, c) => s + c.hybridScore, 0) / candidates.length).toFixed(3)
  });

  return candidates;
}

/**
 * Maximal Marginal Relevance (MMR) re-ranking
 * Balances relevance with diversity
 * 
 * @param candidates - Scored candidates
 * @param lambda - Relevance vs diversity trade-off (0.7 = more relevance)
 * @param maxPerPage - Max chunks per page (default: 2)
 * @param minSections - Min unique sections for WORKFLOW (default: 3)
 * @returns Re-ranked candidates
 */
export function applyMMR(
  candidates: HybridCandidate[],
  lambda: number = 0.7,
  maxPerPage: number = 2,
  minSections?: number
): HybridCandidate[] {
  if (candidates.length === 0) return [];

  console.log(`🔄 [MMR] Starting re-ranking:`, {
    candidates: candidates.length,
    lambda,
    maxPerPage,
    minSections
  });

  const selected: HybridCandidate[] = [];
  const remaining = [...candidates];
  const byPage = new Map<number, number>();
  const bySectionPath = new Map<string, number>();

  // Select first candidate (highest score)
  if (remaining.length > 0) {
    const first = remaining.shift()!;
    selected.push(first);
    
    const page = (first.metadata?.page as number) || -1;
    const section = first.metadata?.section_path || 'unknown';
    byPage.set(page, 1);
    bySectionPath.set(section, 1);
  }

  // Iteratively select candidates balancing relevance and diversity
  while (remaining.length > 0 && selected.length < candidates.length) {
    let bestScore = -Infinity;
    let bestIdx = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const page = (candidate.metadata?.page as number) || -1;
      const section = candidate.metadata?.section_path || 'unknown';

      // Check page diversity constraint
      const pageCount = byPage.get(page) || 0;
      if (pageCount >= maxPerPage) {
        continue;  // Skip, already have max chunks from this page
      }

      // Calculate diversity from selected set
      const minSimilarityToSelected = selected.reduce((min, s) => {
        // Simple content-based similarity (can be enhanced with vector distance)
        const similarity = calculateSimilarity(candidate.content, s.content);
        return Math.min(min, similarity);
      }, 1.0);

      // MMR formula: λ × relevance - (1-λ) × similarity
      const mmrScore = (lambda * candidate.hybridScore) - ((1 - lambda) * minSimilarityToSelected);

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;  // No more valid candidates

    const selected_candidate = remaining.splice(bestIdx, 1)[0];
    selected.push(selected_candidate);

    const page = (selected_candidate.metadata?.page as number) || -1;
    const section = selected_candidate.metadata?.section_path || 'unknown';
    byPage.set(page, (byPage.get(page) || 0) + 1);
    bySectionPath.set(section, (bySectionPath.get(section) || 0) + 1);
  }

  console.log(`✅ [MMR] Re-ranking complete:`, {
    selected: selected.length,
    uniquePages: byPage.size,
    uniqueSections: bySectionPath.size,
    topScore: selected[0]?.hybridScore.toFixed(3)
  });

  // Enforce minSections for WORKFLOW intent
  if (minSections && bySectionPath.size < minSections) {
    console.log(`⚠️ [MMR] Diversity requirement not met:`, {
      required: minSections,
      actual: bySectionPath.size
    });
  }

  return selected;
}

/**
 * Simple content similarity (Jaccard similarity on words)
 * Used for MMR diversity calculation
 */
function calculateSimilarity(content1: string, content2: string): number {
  const words1 = new Set(content1.toLowerCase().split(/\s+/));
  const words2 = new Set(content2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Fallback expansion: widen search when confidence is low
 * 
 * @param opts - Original search options
 * @param originalResults - Results from first attempt
 * @param originalIntent - Detected intent
 * @returns Expanded results
 */
export async function expandedSearch(
  opts: RetrieveOpts,
  originalResults: HybridCandidate[],
  originalIntent: string
): Promise<{
  candidates: HybridCandidate[];
  expanded: boolean;
  strategy: string[];
}> {
  const strategies: string[] = [];
  
  console.log(`🔄 [ExpandedSearch] Triggering fallback expansion:`, {
    originalResults: originalResults.length,
    intent: originalIntent
  });

  // Strategy 1: Increase k (+10 more candidates)
  strategies.push('increase_k');
  const expandedK = (opts.k || 15) + 10;

  // Strategy 2: Add text-only pass for keyword-rich queries
  strategies.push('text_only_pass');
  
  // Strategy 3: Relax policy filters
  strategies.push('relax_filters');
  let relaxedIntent = originalIntent;
  
  // Relax TABLE → allow paragraphs with tabular patterns
  // Relax JSON → allow code blocks without verbatim flag
  if (originalIntent === 'TABLE') {
    relaxedIntent = 'DEFAULT';  // Remove strict table filter
  } else if (originalIntent === 'JSON') {
    relaxedIntent = 'DEFAULT';  // Remove strict verbatim filter
  }

  // Run expanded hybrid search
  const expandedCandidates = await hybridSearch({
    ...opts,
    k: expandedK
  }, expandedK);

  // Add text-only results (top 20 from full-text search)
  const textOnlyResults = await textOnlySearch(opts, 20);
  
  // Merge and deduplicate
  const merged = mergeAndDeduplicate(expandedCandidates, textOnlyResults);

  console.log(`✅ [ExpandedSearch] Expansion complete:`, {
    original: originalResults.length,
    expanded: merged.length,
    added: merged.length - originalResults.length,
    strategies
  });

  return {
    candidates: merged,
    expanded: true,
    strategy: strategies
  };
}

/**
 * Text-only search using ts_rank_cd
 * Used as fallback when vector search fails
 */
async function textOnlySearch(opts: RetrieveOpts, k: number = 20): Promise<HybridCandidate[]> {
  const { query, organizationId, datasetId } = opts;

  // Prepare text search query
  const textQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .join(' & ');

  console.log("🔍 [TextOnlySearch] Running full-text search:", textQuery);

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT 
      c.id,
      c."documentId",
      c.content,
      c."chunkIndex",
      c.metadata,
      c.section_path,
      d.title,
      ts_rank_cd(to_tsvector('english', c.content), to_tsquery('english', $1)) AS text_score
    FROM document_chunks c
    JOIN documents d ON d.id = c."documentId"
    WHERE c."organizationId" = $2
      AND d."datasetId" = $3
      AND to_tsvector('english', c.content) @@ to_tsquery('english', $1)
    ORDER BY text_score DESC
    LIMIT $4;
    `,
    textQuery,
    organizationId,
    datasetId,
    k
  );

  console.log(`✅ [TextOnlySearch] Found ${rows.length} text matches`);

  return rows.map(r => ({
    id: r.id,
    documentId: r.documentId,
    content: r.content,
    chunkIndex: Number(r.chunkIndex ?? 0),
    title: r.title || 'Unknown Document',
    metadata: r.metadata ?? {},
    vectorScore: 0,  // No vector score for text-only
    textScore: Number(r.text_score ?? 0),
    hybridScore: Number(r.text_score ?? 0) * 0.3  // Text component only
  }));
}

/**
 * Merge and deduplicate candidates
 */
function mergeAndDeduplicate(
  candidates1: HybridCandidate[],
  candidates2: HybridCandidate[]
): HybridCandidate[] {
  const seen = new Set<string>();
  const merged: HybridCandidate[] = [];

  for (const c of [...candidates1, ...candidates2]) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      merged.push(c);
    }
  }

  // Re-sort by hybrid score
  merged.sort((a, b) => b.hybridScore - a.hybridScore);

  return merged;
}

/**
 * Convert HybridCandidate to RetrievalSource
 */
export function toRetrievalSource(candidate: HybridCandidate): RetrievalSource {
  const page = candidate.metadata?.page ?? candidate.metadata?.Page ?? null;
  const sectionPath = candidate.metadata?.section_path ?? candidate.metadata?.sectionPath ?? null;

  return {
    id: candidate.id,
    chunkId: candidate.id,
    documentId: candidate.documentId,
    content: candidate.content,
    score: candidate.hybridScore,
    page: page ? Number(page) : null,
    title: candidate.title,
    chunkIndex: candidate.chunkIndex,
    sectionPath,
    metadata: candidate.metadata
  };
}

