/**
 * Fusion Module
 * 
 * Reciprocal Rank Fusion for combining dense and sparse search results
 */
export interface FusionResult {
  id: string;
  score: number;
}

export function rrfFuse(
  dense: Array<{ id: string; score: number }>,
  sparse: Array<{ id: string; score: number }>,
  k = 60
): FusionResult[] {
  const scoreMap = new Map<string, number>();
  
  // Add dense results
  dense.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + rrfScore);
  });
  
  // Add sparse results
  sparse.forEach((result, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    scoreMap.set(result.id, (scoreMap.get(result.id) || 0) + rrfScore);
  });
  
  // Convert to array and sort by score
  const fused: FusionResult[] = Array.from(scoreMap.entries()).map(([id, score]) => ({
    id,
    score
  }));
  
  // Sort by score (descending)
  fused.sort((a, b) => b.score - a.score);
  
  return fused;
}
