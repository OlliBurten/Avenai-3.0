/**
 * Confidence-Based Fallback System
 * Implements ChatGPT-style reflection and auto-widening when confidence is low
 */

import { HybridResult, hybridSearch, expandQuery } from './hybrid';

export interface ConfidenceAnalysis {
  level: 'high' | 'medium' | 'low';
  score: number; // 0-1
  reasons: string[];
  shouldFallback: boolean;
  suggestedAction?: 'expand_query' | 'widen_search' | 'multi_doc' | 'clarify';
}

export interface FallbackOptions {
  datasetId: string;
  organizationId: string;
  query: string;
  initialResults: HybridResult[];
  topK?: number;
  maxRetries?: number;
}

/**
 * Analyze confidence of retrieval results
 * Similar to ChatGPT's internal reflection layer
 */
export function analyzeConfidence(
  query: string,
  results: HybridResult[]
): ConfidenceAnalysis {
  const reasons: string[] = [];
  let score = 0;

  // No results = very low confidence
  if (results.length === 0) {
    return {
      level: 'low',
      score: 0,
      reasons: ['No relevant chunks found'],
      shouldFallback: true,
      suggestedAction: 'expand_query'
    };
  }

  // Check top score
  const topScore = results[0].fusedScore;
  if (topScore > 0.8) {
    score += 0.4;
    reasons.push(`Strong top match (${topScore.toFixed(3)})`);
  } else if (topScore > 0.5) {
    score += 0.2;
    reasons.push(`Moderate top match (${topScore.toFixed(3)})`);
  } else {
    reasons.push(`Weak top match (${topScore.toFixed(3)})`);
  }

  // Check score gap (diversity)
  if (results.length > 1) {
    const scoreGap = results[0].fusedScore - results[1].fusedScore;
    if (scoreGap < 0.1) {
      // Multiple similar-quality results = good coverage
      score += 0.2;
      reasons.push(`Good result diversity (gap=${scoreGap.toFixed(3)})`);
    } else if (scoreGap > 0.3) {
      // One result much better = might be narrow
      reasons.push(`Single strong result, others weaker (gap=${scoreGap.toFixed(3)})`);
    }
  }

  // Check BM25 keyword matches
  const avgMatchedTerms = results.reduce((sum, r) => sum + (r.matchedTerms?.length || 0), 0) / results.length;
  if (avgMatchedTerms >= 2) {
    score += 0.2;
    reasons.push(`Good keyword coverage (avg ${avgMatchedTerms.toFixed(1)} terms)`);
  } else if (avgMatchedTerms < 1) {
    reasons.push(`Weak keyword matches (avg ${avgMatchedTerms.toFixed(1)} terms)`);
  }

  // Check section diversity
  const uniqueSections = new Set(results.map(r => r.sectionPath || 'unknown')).size;
  if (uniqueSections >= 3) {
    score += 0.1;
    reasons.push(`Good section diversity (${uniqueSections} sections)`);
  }

  // Check document diversity
  const uniqueDocs = new Set(results.map(r => r.documentId)).size;
  if (uniqueDocs > 1) {
    score += 0.1;
    reasons.push(`Multi-document results (${uniqueDocs} docs)`);
  }

  // Determine level and action
  let level: 'high' | 'medium' | 'low';
  let shouldFallback = false;
  let suggestedAction: ConfidenceAnalysis['suggestedAction'];

  if (score >= 0.7) {
    level = 'high';
  } else if (score >= 0.4) {
    level = 'medium';
    if (avgMatchedTerms < 1.5) {
      shouldFallback = true;
      suggestedAction = 'expand_query';
    }
  } else {
    level = 'low';
    shouldFallback = true;
    
    // Decide on best fallback strategy
    if (avgMatchedTerms < 1) {
      suggestedAction = 'expand_query';
    } else if (results.length < 3) {
      suggestedAction = 'widen_search';
    } else {
      suggestedAction = 'multi_doc';
    }
  }

  return {
    level,
    score,
    reasons,
    shouldFallback,
    suggestedAction
  };
}

/**
 * Auto-widen retrieval when confidence is low
 * Implements ChatGPT's "reflection loop"
 */
export async function retrieveWithFallback(
  options: FallbackOptions
): Promise<{ results: HybridResult[]; confidence: ConfidenceAnalysis; attempts: number }> {
  const {
    datasetId,
    organizationId,
    query,
    initialResults,
    topK = 10,
    maxRetries = 2
  } = options;

  let attempts = 1;
  let results = initialResults;
  let confidence = analyzeConfidence(query, results);

  console.log(`🧠 [Confidence] Initial: ${confidence.level} (${confidence.score.toFixed(3)}) - ${confidence.reasons.join(', ')}`);

  // If confidence is high, return immediately
  if (!confidence.shouldFallback) {
    return { results, confidence, attempts };
  }

  // Attempt fallback strategies
  for (let retry = 0; retry < maxRetries && confidence.shouldFallback; retry++) {
    attempts++;
    console.log(`🔄 [Fallback] Attempt ${attempts}: ${confidence.suggestedAction}`);

    let newResults: HybridResult[] = [];

    switch (confidence.suggestedAction) {
      case 'expand_query':
        // Expand query with synonyms
        const expandedQuery = expandQuery(query);
        console.log(`   📝 Expanded query: "${expandedQuery}"`);
        
        newResults = await hybridSearch({
          datasetId,
          organizationId,
          query: expandedQuery,
          topK: topK * 2, // Get more results
          vectorWeight: 0.6, // Reduce vector weight, increase keyword weight
          bm25Weight: 0.4
        });
        break;

      case 'widen_search':
        // Increase topK and lower minimum score threshold
        console.log(`   🔍 Widening search to top ${topK * 3}`);
        
        newResults = await hybridSearch({
          datasetId,
          organizationId,
          query,
          topK: topK * 3,
          minScore: 0.0 // Remove score threshold
        });
        break;

      case 'multi_doc':
        // Try to get results from multiple documents
        console.log(`   📚 Forcing multi-document retrieval`);
        
        const allResults = await hybridSearch({
          datasetId,
          organizationId,
          query,
          topK: topK * 4,
          minScore: 0.0
        });
        
        // Take top N from each document
        const byDoc = new Map<string, HybridResult[]>();
        for (const r of allResults) {
          if (!byDoc.has(r.documentId)) {
            byDoc.set(r.documentId, []);
          }
          byDoc.get(r.documentId)!.push(r);
        }
        
        // Take top 3 from each doc, up to topK total
        newResults = [];
        for (const docResults of byDoc.values()) {
          newResults.push(...docResults.slice(0, 3));
          if (newResults.length >= topK) break;
        }
        break;

      case 'clarify':
        // Can't auto-clarify, return what we have
        console.log(`   ❓ Query needs clarification - returning best effort`);
        break;
    }

    if (newResults.length > results.length) {
      results = newResults.slice(0, topK);
      confidence = analyzeConfidence(query, results);
      console.log(`   ✅ Improved: ${confidence.level} (${confidence.score.toFixed(3)})`);
    } else {
      console.log(`   ⚠️ No improvement, stopping fallback`);
      break;
    }
  }

  console.log(`✅ [Confidence] Final: ${confidence.level} after ${attempts} attempt(s)`);

  return { results, confidence, attempts };
}

/**
 * Check if results have sufficient coverage for the query
 * ChatGPT uses this to decide if it can answer confidently
 */
export function checkCoverage(
  query: string,
  results: HybridResult[]
): {
  hasCoverage: boolean;
  missingAspects: string[];
  coverage: number; // 0-1
} {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const allContent = results.map(r => r.content.toLowerCase()).join(' ');
  
  let coveredTerms = 0;
  const missingAspects: string[] = [];
  
  for (const term of queryTerms) {
    if (allContent.includes(term)) {
      coveredTerms++;
    } else {
      // Check for partial matches
      const partial = queryTerms.find(qt => qt.includes(term) || term.includes(qt));
      if (partial && allContent.includes(partial)) {
        coveredTerms += 0.5;
      } else {
        missingAspects.push(term);
      }
    }
  }
  
  const coverage = queryTerms.length > 0 ? coveredTerms / queryTerms.length : 0;
  const hasCoverage = coverage >= 0.6; // At least 60% of query terms should be covered
  
  return {
    hasCoverage,
    missingAspects,
    coverage
  };
}

