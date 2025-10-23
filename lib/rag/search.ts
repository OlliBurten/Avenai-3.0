/**
 * RAG Search Module
 * 
 * Handles hybrid search with dense vectors, BM25, RRF fusion, and re-ranking
 */
import { searchSimilarDocuments } from "../pgvector";
import { getEmbedding } from "../embeddings";
import { bm25Search } from "./sparse";
import { rrfFuse } from "./fusion";
import { rerank } from "./rerank";
import { prisma } from "../prisma";

// Helper function for tokenization
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length >= 2);
}

// Contextual scope detection based on query keywords
function detectContextualScope(query: string, availableDocs: any[]): { scope: string; confidence: number } {
  const q = query.toLowerCase();
  
  // SDK-specific keywords
  const sdkKeywords = {
    'facesdk': ['face', 'liveness', 'biometric', 'selfie', 'portrait', 'faceapi'],
    'docreader': ['document', 'reader', 'mrz', 'barcode', 'passport', 'id', 'license'],
    'auth': ['authentication', 'token', 'oauth', 'login', 'credential', 'bearer'],
    'environment': ['environment', 'test', 'production', 'staging', 'url', 'endpoint'],
    'session': ['session', 'transaction', 'create', 'add', 'finalize']
  };
  
  // Calculate confidence for each scope
  const scopeScores = Object.entries(sdkKeywords).map(([scope, keywords]) => {
    const matches = keywords.filter(keyword => q.includes(keyword)).length;
    return { scope, score: matches / keywords.length };
  });
  
  // Find best match
  const bestMatch = scopeScores.reduce((best, current) => 
    current.score > best.score ? current : best, 
    { scope: 'general', score: 0 }
  );
  
  return {
    scope: bestMatch.score > 0.3 ? bestMatch.scope : 'general',
    confidence: bestMatch.score
  };
}

// Calculate confidence level based on vector similarity score
function calculateConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

// Dense-only search for GPT-5 parity (BM25 disabled)
const USE_SPARSE = false;

export interface SearchOptions {
  orgId: string;
  datasetIds?: string[];
  topK?: number;
  preferDocIds?: string[];
  topicHint?: string;
  brandLock?: string;
  contextualScope?: 'auto' | 'manual';
  confidenceThreshold?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  metadata: {
    orgId: string;
    datasetId: string;
    docId: string;
    chunkIndex: number;
    title: string;
    content: string;
    sourceParagraph?: string;
  };
}

export interface RetrievalDebug {
  selectedDatasetIds?: string[];
  namespace: string;
  denseCount: number;
  sparseCount: number;
  fusedCount: number;
  rerankedCount: number;
}

export async function hybridSearch(
  query: string, 
  options: SearchOptions
): Promise<{ results: SearchResult[]; debug: RetrievalDebug }> {
  const { orgId, datasetIds, topK = 60, preferDocIds = [], topicHint, brandLock, contextualScope = 'auto', confidenceThreshold = 0.5 } = options;
  
  // Hard guard: fail fast if missing orgId
  if (!orgId) {
    console.error("RAG: missing orgId");
    throw new Error("Missing orgId");
  }
  
  const debug: RetrievalDebug = {
    selectedDatasetIds: datasetIds,
    namespace: orgId,
    denseCount: 0,
    sparseCount: 0,
    fusedCount: 0,
    rerankedCount: 0
  };

  try {
    // 1. Dense vector search (topK=60 for GPT-5 parity)
    const denseResults = await denseSearch(query, orgId, datasetIds, 60);
    debug.denseCount = denseResults.length;
    
    console.info("RAG", {
      orgId,
      datasetIds,
      query,
      topicHint,
      preferDocIds,
      kInitial: denseResults.length,
    });

    // 2. BM25 sparse search (topK=30 for fusion) - can be disabled
    const sparseResults = USE_SPARSE ? await bm25Search(query, { orgId, datasetIds, topK: 30 }) : [];
    debug.sparseCount = sparseResults.length;

    // 3. Apply brand lock constraint if present
    let brandFilteredResults = denseResults;
    
    if (brandLock && !query.toLowerCase().includes(brandLock === "avenai" ? "zignsec" : "avenai")) {
      const brandRegex = brandLock === "avenai" ? /avenai/i : /zignsec/i;
      const onBrand = denseResults.filter(r => 
        brandRegex.test(r.metadata?.title || "") || 
        brandRegex.test(r.metadata?.source || "")
      );
      const offBrand = denseResults.filter(r => 
        !(brandRegex.test(r.metadata?.title || "") || 
          brandRegex.test(r.metadata?.source || ""))
      );
      
      if (onBrand.length > 0) {
        brandFilteredResults = [...onBrand, ...offBrand].slice(0, 60);
        console.info("BRAND_LOCK_APPLIED", { 
          brandLock, 
          onBrand: onBrand.length, 
          offBrand: offBrand.length 
        });
      } else {
        console.warn("BRAND_LOCK_EMPTY_FALLBACK", { 
          brandLock, 
          total: denseResults.length 
        });
      }
    }

    // 4. Apply strong preference for anchored docs if preferDocIds is set
    let finalResults = brandFilteredResults;
    
    if (preferDocIds.length > 0) {
      const preferred = brandFilteredResults.filter(r => r.metadata?.docId === preferDocIds[0]);
      const others = brandFilteredResults.filter(r => r.metadata?.docId !== preferDocIds[0]);
      
      console.info("RAG_ANCHOR_SPLIT", { 
        preferredCount: preferred.length, 
        othersCount: others.length 
      });
      
      if (preferred.length > 0) {
        // Put preferred docs first, then others
        finalResults = [...preferred, ...others].slice(0, 60);
      }
    }
    
    // 5. Apply topic bias to final results (only boosting, no filtering)
    const qTokens = tokenize((topicHint ? (topicHint + " " + query) : query));
    const has = (s: string) => qTokens.some(t => s.toLowerCase().includes(t));
    
    const boosted = finalResults.map(r => {
      let bonus = 0;
      if (preferDocIds.includes(r.metadata?.docId || "")) bonus += 0.35;
      if (has(r.metadata?.title || "")) bonus += 0.25;
      const brand = /(avenai|identity api|bankid|zignsec)/i;
      if (brand.test(query) && brand.test(r.metadata?.title || "")) bonus += 0.20;
      const score = Math.min(1, r.score + bonus);
      return { ...r, score };
    });

    const ranked = boosted.sort((a, b) => b.score - a.score);
    
    console.info("RAG", {
      orgId,
      datasetIds,
      query,
      topicHint,
      preferDocIds,
      kInitial: denseResults.length,
      kAfterBoost: ranked.length,
    });

    // 6. Zero-result fallback ladder
    let fallbackResults = ranked;
    
    if (fallbackResults.length === 0) {
      console.warn("RAG fallback step", { step: "A", query, datasetIds });
      // Step A: rerun dense without preferDocIds/topicHint bonuses
      const densePlain = await denseSearch(query, orgId, datasetIds, 60);
      if (densePlain.length > 0) {
        fallbackResults = densePlain;
        console.info("RAG fallback A success", { found: densePlain.length });
      }
    }
    
    if (fallbackResults.length === 0) {
      console.warn("RAG fallback step", { step: "B", query, datasetIds });
      // Step B: widen to topK=120 (still dense-only), no boosts, same datasetIds/orgId
      const denseWide = await denseSearch(query, orgId, datasetIds, 120);
      if (denseWide.length > 0) {
        fallbackResults = denseWide;
        console.info("RAG fallback B success", { found: denseWide.length });
      }
    }
    
    if (fallbackResults.length === 0) {
      console.warn("RAG fallback step", { step: "C", query, datasetIds });
      // Step C: return empty results - will be handled by chat route
      return { results: [], debug };
    }

    // 7. RRF fusion (use fallback results)
    const fusedResults = rrfFuse(fallbackResults, sparseResults, 60);
    debug.fusedCount = fusedResults.length;

    // 8. Fetch chunk payloads for top 40 fused results (for reranking)
    const topFusedIds = fusedResults.slice(0, 40).map(r => r.id);
    // Pinecone IDs are now the actual database chunk IDs
    const chunks = await fetchChunkPayloads(topFusedIds, orgId);

    // 9. Re-rank with LLM
    const rerankCandidates = chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      metadata: {
        title: chunk.document?.title || "Untitled",
        datasetId: chunk.document?.datasetId || "default",
        docId: chunk.documentId
      },
      score: fusedResults.find(f => f.id === chunk.id)?.score || 0
    }));

    const rerankedResults = await rerank(query, rerankCandidates);
    debug.rerankedCount = rerankedResults.length;

    // 10. Map back to final results with confidence and contextual scope
    const finalSearchResults: SearchResult[] = rerankedResults.map(result => {
      const chunk = chunks.find(c => c.id === result.id);
      const confidence = calculateConfidence(result.score);
      
      // Extract source paragraph for citations
      const content = chunk?.content || "";
      const sourceParagraph = content.length > 200 
        ? content.substring(0, 200) + "..." 
        : content;
      
      return {
        id: result.id,
        score: result.score,
        confidence,
        metadata: {
          orgId,
          datasetId: chunk?.document?.datasetId || "default",
          docId: chunk?.documentId || "",
          chunkIndex: chunk?.chunkIndex || 0,
          title: chunk?.document?.title || "Untitled",
          content,
          sourceParagraph
        }
      };
    });

    // Log final results with comprehensive debugging
    console.info("RAG_FINAL", {
      orgId,
      datasetIds: datasetIds?.join(',') || 'all',
      query: query.substring(0, 50),
      dense: debug.denseCount,
      sparse: debug.sparseCount,
      fused: debug.fusedCount,
      reranked: debug.rerankedCount,
      final: finalSearchResults.length,
      brandLock,
      preferDocIds: preferDocIds.length,
      topicHint
    });

    return { results: finalSearchResults, debug };

  } catch (error) {
    console.error("Hybrid search failed:", error);
    console.info(`RAG empty org=${orgId} datasets=[${datasetIds?.join(',') || 'all'}] query="${query.substring(0, 50)}"`);
    return { results: [], debug };
  }
}

async function denseSearch(
  query: string, 
  orgId: string, 
  datasetIds?: string[], 
  topK: number = 60
): Promise<Array<{ id: string; score: number; metadata?: any }>> {
  try {
    const results = await searchSimilarDocuments(query, orgId, datasetIds, undefined, topK);
    
    return results.map((result: any) => ({
      id: result.id,
      score: result.score || 0,
      metadata: result.metadata
    }));
  } catch (error) {
    console.error("Dense search failed:", error);
    return [];
  }
}

async function fetchChunkPayloads(chunkIds: string[], orgId: string) {
  try {
    const chunks = await prisma.documentChunk.findMany({
      where: {
        id: { in: chunkIds },
        organizationId: orgId
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            datasetId: true
          }
        }
      }
    });

    return chunks;
  } catch (error) {
    console.error("Failed to fetch chunk payloads:", error);
    return [];
  }
}

// Legacy function for backward compatibility
export async function semanticSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
  const { results } = await hybridSearch(query, options);
  return results;
}

/**
 * Handle empty retrieval with helpful response
 */
export function createEmptyRetrievalResponse(selectedDatasetIds?: string[]): string {
  if (selectedDatasetIds && selectedDatasetIds.length > 0) {
    return `I couldn't find relevant content in the selected datasets (${selectedDatasetIds.join(', ')}). Try selecting "All datasets" or re-processing the document.`;
  }
  return "I couldn't find relevant content in your documents. Try uploading more documents or re-processing existing ones.";
}
