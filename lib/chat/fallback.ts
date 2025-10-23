// lib/chat/fallback.ts
// Confidence scoring and fallback detection

import { Intent, getMinSections } from './retrieval-policy';

/**
 * Determine if retrieval should trigger fallback/retry
 * Based on score gap, section diversity, and intent-specific thresholds
 */
export function shouldFallback(
  scores: number[], 
  sections: (string | null | undefined)[],
  intent: Intent
): boolean {
  if (scores.length === 0) {
    return true;  // No results - definitely need fallback
  }
  
  // Calculate score gap (top score vs median)
  const top5 = scores.slice(0, 5);
  const sorted = [...top5].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const gap = (top5[0] ?? 0) - median;
  
  // Count unique sections
  const uniqueSections = new Set(
    sections.filter(s => s && s.trim().length > 0)
  ).size;
  
  // Get intent-specific minimum sections requirement
  const minSections = getMinSections(intent);
  
  // Top score absolute threshold
  const topScore = scores[0] ?? 0;
  
  // Trigger fallback if:
  // 1. Score gap too small (results are all similar, might be missing better ones)
  // 2. Section diversity too low (stuck on one section)
  // 3. Top score too low (low confidence)
  const needsFallback = 
    gap < 0.04 || 
    uniqueSections < minSections || 
    topScore < 0.12;
  
  if (needsFallback) {
    console.log('🔄 Fallback triggered:', {
      gap: gap.toFixed(3),
      uniqueSections,
      minSections,
      topScore: topScore.toFixed(3),
      intent,
      reason: gap < 0.04 ? 'low_gap' : uniqueSections < minSections ? 'low_diversity' : 'low_confidence'
    });
  }
  
  return needsFallback;
}

/**
 * Calculate confidence level from scores and diversity
 */
export function calculateConfidenceLevel(
  topScore: number,
  avgScore: number,
  uniqueSections: number,
  intent: Intent
): 'high' | 'medium' | 'low' {
  // High confidence: good score + good diversity
  if (topScore >= 0.25 && avgScore >= 0.18 && uniqueSections >= 3) {
    return 'high';
  }
  
  // Medium confidence: decent score or diversity
  if (topScore >= 0.15 && (avgScore >= 0.12 || uniqueSections >= 2)) {
    return 'medium';
  }
  
  // Low confidence: everything else
  return 'low';
}

/**
 * Get fallback strategy configuration
 * Returns adjusted parameters for retry attempt
 */
export function getFallbackStrategy(
  originalK: number,
  intent: Intent
): {
  k: number;
  removeMetaFilter: boolean;
  useBM25Only: boolean;
  relaxMinScore: boolean;
} {
  return {
    k: originalK + 10,           // Increase by 10
    removeMetaFilter: true,      // Remove element_type filter
    useBM25Only: false,          // Still use hybrid (for now)
    relaxMinScore: true          // Lower minScore threshold
  };
}

