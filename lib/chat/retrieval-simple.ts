// lib/chat/retrieval-simple.ts
// Retrieval wrapper with intent-aware policy + hybrid search + MMR (PR-4 complete)

import type { RetrieveOpts, RetrievalMeta, RetrievalSource } from "./types";
import { semanticSearchOnly } from "./semantic-pg";
import { applyPolicy, type Candidate } from "@/lib/retrieval/policy";
import { hybridSearch, applyMMR, expandedSearch, toRetrievalSource, type HybridCandidate } from "./hybrid-search";

// Feature flags
const HYBRID_ENABLED = process.env.HYBRID_SEARCH !== 'false';  // Default: enabled
const MMR_ENABLED = process.env.MMR_RERANK !== 'false';  // Default: enabled
const FALLBACK_ENABLED = process.env.FALLBACK_EXPANSION !== 'false';  // Default: enabled

export async function retrieveSimple(opts: RetrieveOpts): Promise<{
  contexts: RetrievalSource[];
  meta: RetrievalMeta;
}> {
  const t0 = Date.now();
  
  const intent = opts.intent || detectIntent(opts.query);
  console.log(`🎯 [RetrievalSimple] Intent detected: ${intent}`, {
    query: opts.query.substring(0, 60),
    hybridEnabled: HYBRID_ENABLED,
    mmrEnabled: MMR_ENABLED,
    fallbackEnabled: FALLBACK_ENABLED
  });

  // Step 1: Retrieve candidates using hybrid search (vector + text fusion)
  let hybridCandidates: HybridCandidate[];
  
  if (HYBRID_ENABLED) {
    // Use hybrid search (0.7 vector + 0.3 text)
    hybridCandidates = await hybridSearch(opts, 50);
    console.log(`✅ [RetrievalSimple] Hybrid search returned ${hybridCandidates.length} candidates`);
  } else {
    // Fallback to pure vector search
    const vectorOnly = await semanticSearchOnly({ ...opts, k: 50 });
    hybridCandidates = vectorOnly.map(v => ({
      id: v.id,
      documentId: v.documentId,
      content: v.content,
      chunkIndex: v.chunkIndex,
      title: v.title,
      metadata: v.metadata ?? {},
      vectorScore: v.score,
      textScore: 0,
      hybridScore: v.score
    }));
    console.log(`✅ [RetrievalSimple] Vector-only search returned ${hybridCandidates.length} candidates`);
  }
  
  // Step 2: Apply MMR re-ranking for diversity
  let rankedCandidates: HybridCandidate[];
  
  if (MMR_ENABLED) {
    const minSections = intent === 'WORKFLOW' ? 3 : undefined;
    rankedCandidates = applyMMR(hybridCandidates, 0.7, 2, minSections);
    console.log(`✅ [RetrievalSimple] MMR re-ranking applied: ${rankedCandidates.length} candidates`);
  } else {
    rankedCandidates = hybridCandidates;
  }

  // Step 3: Convert to Candidate format for policy
  const candidates: Candidate[] = rankedCandidates.map(c => ({
    id: c.id,
    documentId: c.documentId,
    chunkIndex: c.chunkIndex,
    content: c.content,
    sectionPath: c.metadata?.section_path || c.metadata?.sectionPath || null,
    metadata: c.metadata,
    vectorScore: c.vectorScore,
    textScore: c.textScore,
    score: c.hybridScore
  }));

  // Step 4: Apply Policy for intent-aware filtering
  const policyCandidates = applyPolicy(intent, candidates);

  console.log(`🎯 [RetrievalSimple] Policy applied:`, {
    intent,
    originalCandidates: candidates.length,
    afterPolicy: policyCandidates.length
  });

  // Step 5: Calculate confidence
  const scores = policyCandidates.map(c => c.score || 0).sort((a, b) => b - a);
  const top1 = scores[0] ?? 0;
  const top2 = scores[1] ?? 0;
  const top5 = scores.slice(0, 5);
  const medianTop5 = top5.length > 0 ? top5[Math.floor(top5.length / 2)] : 0;
  const scoreGap = top1 - medianTop5;  // Use median as per GPT spec
  const uniqueSections = new Set(
    policyCandidates.map(c => c.sectionPath || `page:${(c.metadata as any)?.page ?? -1}`)
  ).size;

  const confidenceLevel = top1 > 0.3 && scoreGap > 0.1 ? 'high' : top1 > 0.2 ? 'medium' : 'low';

  console.log(`📊 [RetrievalSimple] Confidence calculated:`, {
    level: confidenceLevel,
    score: top1.toFixed(3),
    scoreGap: scoreGap.toFixed(3),
    uniqueSections
  });

  // Step 6: Check if fallback expansion is needed
  const shouldExpand = confidenceLevel === 'low' && policyCandidates.length < 5;
  let finalCandidates = policyCandidates;
  let expansionStrategy: string[] = [];
  
  if (shouldExpand && FALLBACK_ENABLED) {
    console.log(`🔄 [RetrievalSimple] Triggering fallback expansion: low confidence`);
    
    // Expand search: increase k, add text-only pass, relax filters
    const expandedResult = await expandedSearch(
      opts,
      candidates,
      intent
    );
    
    // Re-apply policy with relaxed rules
    const expandedCandidates = applyPolicy(intent, expandedResult.candidates);
    
    if (expandedCandidates.length > finalCandidates.length) {
      finalCandidates = expandedCandidates;
      expansionStrategy = expandedResult.strategy;
      console.log(`✅ [RetrievalSimple] Fallback successful: ${expandedCandidates.length} candidates`);
    }
  }

  // Step 7: Convert to RetrievalSource format
  const selected: RetrievalSource[] = finalCandidates.map(c => ({
    id: c.id,
    chunkId: c.id,
    documentId: c.documentId,
    chunkIndex: c.chunkIndex,
    content: c.content,
    sectionPath: c.sectionPath,
    metadata: c.metadata,
    score: c.score || 0,
    title: '', // Will be populated by caller
    page: (c.metadata as any)?.page || null
  }));

  const elapsed = Date.now() - t0;
  console.log(`✅ [RetrievalSimple] Complete in ${elapsed}ms:`, {
    finalCount: selected.length,
    topScore: top1.toFixed(3),
    scoreGap: scoreGap.toFixed(3),
    uniqueSections,
    fallbackTriggered: shouldExpand,
    hybridEnabled: HYBRID_ENABLED,
    mmrEnabled: MMR_ENABLED
  });

  return {
    contexts: selected,
    meta: {
      top1,
      scoreGap,
      uniqueSections,
      fallbackTriggered: shouldExpand,
      retrievalTimeMs: elapsed,
      intent,
      hybridEnabled: HYBRID_ENABLED,
      mmrEnabled: MMR_ENABLED,
      expansionStrategy: expansionStrategy.length > 0 ? expansionStrategy : undefined
    },
  };
}
