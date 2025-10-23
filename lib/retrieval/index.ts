/**
 * Unified Retrieval Interface
 * Complete ChatGPT-level retrieval pipeline
 * Combines: Hybrid Search + MMR + Policy + Cross-Doc + Confidence Fallback
 */

import { hybridSearch, HybridResult } from './hybrid';
import { mmrDiverseResults } from './mmr';
import { applyPolicy, detectIntent, Intent } from './policy';
import { analyzeConfidence, retrieveWithFallback, ConfidenceAnalysis } from './confidence-fallback';
import { boostDomainRelevance } from './domain-schemas';
import { 
  perDocCapMerge, 
  labelDocuments, 
  resolveConflicts, 
  formatSourceSummary,
  extractDocumentLabels 
} from './crossDoc';
import { logRetrievalMetrics } from '../telemetry/retrieval-metrics';
import { getPhase4Flags } from '../config/feature-flags';

export interface RetrievalOptions {
  query: string;
  datasetId: string;
  organizationId: string;
  intent?: Intent;
  topK?: number;
  enableFallback?: boolean;
  enableMMR?: boolean;
  enablePolicy?: boolean;
  enableCrossDoc?: boolean;
  enableDomainBoost?: boolean;
  // Override feature flags (for testing)
  forceFlags?: Partial<{
    HYBRID_FUSION: boolean;
    MMR_RERANK: boolean;
    FALLBACK_EXPAND: boolean;
    CROSS_DOC_MERGE: boolean;
  }>;
}

export interface RetrievalResult {
  results: HybridResult[];
  confidence: ConfidenceAnalysis;
  metadata: {
    intent: Intent;
    vectorCount: number;
    textCount: number;
    fusedCount: number;
    mmrCount?: number;
    crossDocCount?: number;
    documentCount: number;
    attempts: number;
    sourceSummary: string;
    retrievalTimeMs: number;
  };
}

/**
 * Complete retrieval pipeline
 * This is the main entry point for all retrieval operations
 */
export async function retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
  const startTime = Date.now();
  
  const {
    query,
    datasetId,
    organizationId,
    intent: providedIntent,
    topK = 12,
    forceFlags
  } = options;

  // Read feature flags from environment (with optional override)
  const envFlags = getPhase4Flags();
  const flags = {
    HYBRID_FUSION: forceFlags?.HYBRID_FUSION ?? envFlags.HYBRID_FUSION,
    MMR_RERANK: forceFlags?.MMR_RERANK ?? envFlags.MMR_RERANK,
    FALLBACK_EXPAND: forceFlags?.FALLBACK_EXPAND ?? envFlags.FALLBACK_EXPAND,
    CROSS_DOC_MERGE: forceFlags?.CROSS_DOC_MERGE ?? envFlags.CROSS_DOC_MERGE
  };

  // Determine which features to enable based on flags
  const enableFallback = flags.FALLBACK_EXPAND;
  const enableMMR = flags.MMR_RERANK;
  const enablePolicy = flags.HYBRID_FUSION; // Policy requires hybrid
  const enableCrossDoc = flags.CROSS_DOC_MERGE;
  const enableDomainBoost = flags.HYBRID_FUSION; // Domain boost requires hybrid

  console.log(`\n🔍 [Retrieval Pipeline] Query: "${query.substring(0, 80)}..."`);
  console.log(`🎚️  [Flags] Hybrid=${flags.HYBRID_FUSION}, MMR=${flags.MMR_RERANK}, Fallback=${flags.FALLBACK_EXPAND}, CrossDoc=${flags.CROSS_DOC_MERGE}`);

  // Step 1: Detect intent
  const intent = providedIntent || detectIntent(query);
  console.log(`🎯 [Step 1] Intent: ${intent}`);

  // Step 2: Hybrid search (vector + FTS)
  const hybridResults = await hybridSearch({
    query,
    datasetId,
    organizationId,
    topK: topK * 4, // Get more candidates for filtering/MMR
    vectorWeight: 0.7,
    textWeight: 0.3
  });

  const vectorCount = hybridResults.filter(r => r.vectorScore > 0).length;
  const textCount = hybridResults.filter(r => r.textScore > 0).length;

  console.log(`🔀 [Step 2] Hybrid: ${hybridResults.length} results (vector: ${vectorCount}, text: ${textCount})`);

  if (hybridResults.length === 0) {
    console.log(`⚠️ [Retrieval Pipeline] No results found - returning empty`);
    return {
      results: [],
      confidence: {
        level: 'low',
        score: 0,
        reasons: ['No results found'],
        shouldFallback: false
      },
      metadata: {
        intent,
        vectorCount: 0,
        textCount: 0,
        fusedCount: 0,
        documentCount: 0,
        attempts: 1,
        sourceSummary: 'No sources found',
        retrievalTimeMs: Date.now() - startTime
      }
    };
  }

  let currentResults = hybridResults;
  let attempts = 1;

  // Step 3: Apply soft-filter policy (intent-aware boosting)
  if (enablePolicy && intent !== 'DEFAULT') {
    const candidates = currentResults.map(r => ({
      id: r.id,
      content: r.content,
      section_path: r.sectionPath,
      page: r.page || null,
      document_id: r.documentId,
      chunk_index: r.chunkIndex,
      metadata: r.metadata,
      cosine: r.vectorScore,
      textScore: r.textScore,
      finalScore: r.fusedScore
    }));

    const policiedCandidates = applyPolicy(intent, candidates);
    
    // Map back to HybridResult with updated scores
    currentResults = policiedCandidates.map(c => ({
      ...hybridResults.find(r => r.id === c.id)!,
      fusedScore: c.finalScore
    })).sort((a, b) => b.fusedScore - a.fusedScore);

    console.log(`🎯 [Step 3] Policy (${intent}): ${currentResults.length} results after boosting`);
  }

  // Step 4: Domain boosting (headers, endpoints, errors)
  if (enableDomainBoost) {
    currentResults = boostDomainRelevance(currentResults, query);
    console.log(`📈 [Step 4] Domain boost: ${currentResults.length} results`);
  }

  // Step 5: Cross-document merge (balanced distribution)
  if (enableCrossDoc) {
    // Get unique document count
    const uniqueDocs = new Set(currentResults.map(r => r.documentId)).size;
    
    if (uniqueDocs > 1) {
      // Convert to candidates for cross-doc merge
      const candidates = currentResults.map(r => ({
        id: r.id,
        content: r.content,
        section_path: r.sectionPath,
        page: r.page || null,
        document_id: r.documentId,
        chunk_index: r.chunkIndex,
        metadata: r.metadata,
        cosine: r.vectorScore,
        textScore: r.textScore,
        finalScore: r.fusedScore
      }));

      // Add document labels
      const docTitles = new Map<string, string>();
      for (const r of currentResults) {
        docTitles.set(r.documentId, r.documentTitle);
      }
      
      const labeled = labelDocuments(candidates, docTitles);
      
      // Apply cross-doc merge
      const merged = perDocCapMerge(labeled, {
        perDoc: 5,
        totalMax: topK * 1.5 // Get a bit more for MMR
      });
      
      // Resolve conflicts (locale/product bleed)
      const resolved = resolveConflicts(merged, query);
      
      // Map back to HybridResult
      currentResults = resolved.map(c => ({
        ...hybridResults.find(r => r.id === c.id)!,
        fusedScore: c.finalScore
      })).sort((a, b) => b.fusedScore - a.fusedScore);

      console.log(`🌍 [Step 5] Cross-Doc: ${currentResults.length} results from ${uniqueDocs} documents`);
    } else {
      console.log(`🌍 [Step 5] Cross-Doc: Skipped (only 1 document)`);
    }
  }

  // Step 6: MMR diversity
  if (enableMMR) {
    currentResults = mmrDiverseResults(currentResults, {
      maxReturn: topK,
      maxPerPage: 2,
      minSections: 3
    });
    console.log(`📊 [Step 6] MMR: ${currentResults.length} diverse results`);
  } else {
    currentResults = currentResults.slice(0, topK);
  }

  // Step 7: Confidence check + fallback
  const confidence = analyzeConfidence(query, currentResults as any);
  
  if (enableFallback && confidence.shouldFallback && confidence.suggestedAction) {
    console.log(`⚠️ [Step 7] Low confidence (${confidence.score.toFixed(2)}) - attempting fallback: ${confidence.suggestedAction}`);
    
    const fallbackResult = await retrieveWithFallback({
      query,
      datasetId,
      organizationId,
      initialResults: currentResults as any,
      topK,
      maxRetries: 2
    });
    
    currentResults = fallbackResult.results as any;
    confidence.level = fallbackResult.confidence.level;
    confidence.score = fallbackResult.confidence.score;
    confidence.reasons = fallbackResult.confidence.reasons;
    attempts = fallbackResult.attempts;
    
    console.log(`✅ [Step 7] Fallback: ${confidence.level} confidence after ${attempts} attempt(s)`);
  } else {
    console.log(`✅ [Step 7] Confidence: ${confidence.level} (${confidence.score.toFixed(2)}) - no fallback needed`);
  }

  // Step 8: Calculate metadata
  const documentCount = new Set(currentResults.map(r => r.documentId)).size;
  const sourceSummary = formatSourceSummary(currentResults);
  const retrievalTimeMs = Date.now() - startTime;

  console.log(`📊 [Summary] ${currentResults.length} results from ${documentCount} doc(s) in ${retrievalTimeMs}ms`);
  console.log(`   ${sourceSummary}`);
  console.log(`   Confidence: ${confidence.level} (${confidence.score.toFixed(2)})`);

  // Log metrics for monitoring
  const topScore = currentResults[0]?.fusedScore || 0;
  const uniqueSections = new Set(currentResults.map(r => r.sectionPath).filter(Boolean)).size;
  const endpointFound = currentResults.some(r => 
    r.metadata?.endpoint || /^(GET|POST|PUT|PATCH|DELETE)\s+\//m.test(r.content)
  );
  const verbatimFound = currentResults.some(r => 
    r.metadata?.has_verbatim === true || r.metadata?.verbatim_block
  );

  logRetrievalMetrics({
    intent,
    topScore,
    uniqueSections,
    uniqueDocuments: documentCount,
    fallbackTriggered: attempts > 1,
    fallbackAttempts: attempts,
    endpointFound,
    verbatimFound,
    emptyAnswer: currentResults.length === 0,
    confidenceLevel: confidence.level,
    retrievalTimeMs,
    vectorCount,
    textCount,
    fusedCount: hybridResults.length,
    finalCount: currentResults.length
  });

  return {
    results: currentResults,
    confidence,
    metadata: {
      intent,
      vectorCount,
      textCount,
      fusedCount: hybridResults.length,
      mmrCount: enableMMR ? currentResults.length : undefined,
      crossDocCount: enableCrossDoc ? documentCount : undefined,
      documentCount,
      attempts,
      sourceSummary,
      retrievalTimeMs
    }
  };
}

/**
 * Export all components for granular control
 */
export {
  hybridSearch,
  mmrDiverseResults,
  applyPolicy,
  detectIntent,
  analyzeConfidence,
  retrieveWithFallback,
  boostDomainRelevance,
  perDocCapMerge,
  labelDocuments,
  resolveConflicts,
  formatSourceSummary,
  extractDocumentLabels
};

export type { Intent, HybridResult, ConfidenceAnalysis };

