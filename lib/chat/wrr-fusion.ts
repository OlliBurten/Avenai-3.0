// lib/chat/wrr-fusion.ts
// Weighted Reciprocal Rank fusion for combining vector + BM25 results

export interface ScoredChunk {
  id: string;
  content: string;
  score: number;
  source: 'vector' | 'bm25' | 'db';
  rank?: number;
  [key: string]: any;
}

export interface FusionWeights {
  vector: number;
  bm25: number;
  k: number;  // Rank constant for RRF
}

const DEFAULT_WEIGHTS: FusionWeights = {
  vector: 0.7,   // Semantic search weight
  bm25: 0.3,     // Keyword search weight
  k: 60          // RRF constant (higher = less emphasis on rank)
};

/**
 * Weighted Reciprocal Rank Fusion
 * Combines vector and BM25 results with weighted scoring
 * 
 * Formula: score = w_vector * (1/(k + rank_vector)) + w_bm25 * (1/(k + rank_bm25))
 */
export function weightedReciprocalRankFusion(
  vectorResults: ScoredChunk[],
  bm25Results: ScoredChunk[],
  weights: Partial<FusionWeights> = {}
): ScoredChunk[] {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  
  console.log('🔀 WRR Fusion:', {
    vectorCount: vectorResults.length,
    bm25Count: bm25Results.length,
    weights: `${w.vector}/${w.bm25}`,
    k: w.k
  });
  
  // Build rank maps
  const vectorRanks = new Map<string, number>();
  const bm25Ranks = new Map<string, number>();
  
  vectorResults.forEach((chunk, index) => {
    vectorRanks.set(chunk.id, index + 1);
  });
  
  bm25Results.forEach((chunk, index) => {
    bm25Ranks.set(chunk.id, index + 1);
  });
  
  // Collect all unique chunks
  const allChunks = new Map<string, ScoredChunk>();
  
  [...vectorResults, ...bm25Results].forEach(chunk => {
    if (!allChunks.has(chunk.id)) {
      allChunks.set(chunk.id, chunk);
    }
  });
  
  // Calculate fused scores
  const fusedResults: ScoredChunk[] = [];
  
  for (const [id, chunk] of allChunks.entries()) {
    const vectorRank = vectorRanks.get(id);
    const bm25Rank = bm25Ranks.get(id);
    
    // Calculate RRF score
    let fusedScore = 0;
    
    if (vectorRank !== undefined) {
      fusedScore += w.vector * (1 / (w.k + vectorRank));
    }
    
    if (bm25Rank !== undefined) {
      fusedScore += w.bm25 * (1 / (w.k + bm25Rank));
    }
    
    fusedResults.push({
      ...chunk,
      score: fusedScore,
      rank: Math.min(vectorRank ?? Infinity, bm25Rank ?? Infinity),
      fusionMeta: {
        vectorRank: vectorRank ?? null,
        bm25Rank: bm25Rank ?? null,
        vectorScore: chunk.source === 'vector' ? chunk.score : null,
        bm25Score: chunk.source === 'bm25' ? chunk.score : null
      }
    });
  }
  
  // Sort by fused score (highest first)
  fusedResults.sort((a, b) => b.score - a.score);
  
  console.log('✅ WRR Fusion complete:', {
    inputTotal: vectorResults.length + bm25Results.length,
    uniqueChunks: fusedResults.length,
    topScores: fusedResults.slice(0, 5).map(r => r.score.toFixed(4)),
    bothSources: fusedResults.filter(r => r.fusionMeta?.vectorRank && r.fusionMeta?.bm25Rank).length
  });
  
  return fusedResults;
}

/**
 * Normalize scores to 0-1 range
 */
export function normalizeScores(chunks: ScoredChunk[]): ScoredChunk[] {
  if (chunks.length === 0) return chunks;
  
  const maxScore = Math.max(...chunks.map(c => c.score));
  const minScore = Math.min(...chunks.map(c => c.score));
  const range = maxScore - minScore;
  
  if (range === 0) return chunks;
  
  return chunks.map(chunk => ({
    ...chunk,
    score: (chunk.score - minScore) / range,
    originalScore: chunk.score
  }));
}

/**
 * Calculate diversity score based on section distribution
 */
export function calculateDiversityScore(
  chunks: ScoredChunk[],
  sectionKey: string = 'sectionPath'
): number {
  const sections = chunks
    .map(c => (c as any)[sectionKey])
    .filter(s => s && s.trim().length > 0);
  
  const uniqueSections = new Set(sections);
  
  // Diversity score: unique sections / total chunks
  // Higher is better (more diverse)
  return sections.length > 0 ? uniqueSections.size / sections.length : 0;
}

