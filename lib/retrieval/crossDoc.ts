/**
 * Cross-Document Merge
 * Balanced distribution across multiple documents with clear labeling
 * Prevents locale/product bleed (e.g., Sweden vs Norway endpoints)
 */

import { Candidate } from './hybrid';
import { HybridResult } from './hybrid';

export interface CrossDocOptions {
  perDoc?: number;      // Max results per document (default: 5)
  totalMax?: number;    // Max total results (default: 14)
  preferCurrent?: boolean;  // Prefer results from the "main" document (default: true)
}

export interface LabeledCandidate extends Candidate {
  docLabel?: string;    // e.g., "BankID Sweden Guide v5"
  docCountry?: string;  // e.g., "Sweden", "Norway"
  docProduct?: string;  // e.g., "BankID", "Mobile SDK"
}

/**
 * Merge candidates with per-document caps
 * Ensures balanced representation across multiple documents
 */
export function perDocCapMerge(
  candidates: Candidate[],
  options: CrossDocOptions = {}
): Candidate[] {
  const {
    perDoc = 5,
    totalMax = 14
  } = options;

  // Group by document ID
  const byDoc = new Map<string, Candidate[]>();
  
  for (const candidate of candidates) {
    const docId = candidate.document_id ?? 'unknown';
    
    if (!byDoc.has(docId)) {
      byDoc.set(docId, []);
    }
    
    const docCandidates = byDoc.get(docId)!;
    if (docCandidates.length < perDoc) {
      docCandidates.push(candidate);
    }
  }

  console.log(`📚 [Cross-Doc] Documents: ${byDoc.size}, per-doc limit: ${perDoc}`);
  
  // Log distribution
  for (const [docId, cands] of byDoc) {
    const docLabel = (cands[0] as any).docLabel || docId.substring(0, 8);
    console.log(`   ${docLabel}: ${cands.length} chunks (scores: ${cands[0]?.finalScore.toFixed(3)}-${cands[cands.length-1]?.finalScore.toFixed(3)})`);
  }

  // Flatten and sort by score
  const merged = Array.from(byDoc.values())
    .flat()
    .sort((a, b) => b.finalScore - a.finalScore);

  // Take top N
  const final = merged.slice(0, totalMax);
  
  console.log(`✅ [Cross-Doc] Merged: ${final.length}/${merged.length} candidates from ${byDoc.size} documents`);

  return final;
}

/**
 * Add document labels to candidates
 * Extracts country, product, version from document title
 */
export function labelDocuments<T extends { metadata?: any }>(
  results: T[],
  documentTitles: Map<string, string>
): (T & { docLabel?: string; docCountry?: string; docProduct?: string })[] {
  return results.map(result => {
    const docId = (result as any).document_id || (result as any).documentId;
    const title = documentTitles.get(docId) || 'Unknown';
    
    // Extract structured labels from title
    const labels = extractDocumentLabels(title);
    
    return {
      ...result,
      docLabel: labels.label,
      docCountry: labels.country,
      docProduct: labels.product
    };
  });
}

/**
 * Extract structured labels from document title
 * Examples:
 * - "BankID Sweden v5 Implementation Guide" → {country: "Sweden", product: "BankID", version: "v5"}
 * - "BankID Norway API Reference" → {country: "Norway", product: "BankID"}
 */
export function extractDocumentLabels(title: string): {
  label: string;
  country?: string;
  product?: string;
  version?: string;
} {
  // Extract country
  const countryMatch = title.match(/\b(Sweden|Norway|Denmark|Finland|Estonia|Latvia|Lithuania)\b/i);
  const country = countryMatch ? countryMatch[1] : undefined;
  
  // Extract product
  const productMatch = title.match(/\b(BankID|Mobile SDK|ID Verification|Bio Verification|eID)\b/i);
  const product = productMatch ? productMatch[1] : undefined;
  
  // Extract version
  const versionMatch = title.match(/\bv?(\d+(?:\.\d+)?)\b/);
  const version = versionMatch ? `v${versionMatch[1]}` : undefined;
  
  // Build label
  let label = title;
  if (product && country) {
    label = `${product} ${country}`;
    if (version) label += ` ${version}`;
  } else if (product) {
    label = product;
    if (version) label += ` ${version}`;
  }
  
  return { label, country, product, version };
}

/**
 * Conflict resolver for multi-document results
 * Handles locale bleed (Sweden vs Norway endpoints)
 */
export function resolveConflicts<T extends { 
  content: string; 
  docCountry?: string; 
  docProduct?: string;
  finalScore?: number;
}>(
  results: T[],
  query: string
): T[] {
  const queryLower = query.toLowerCase();
  
  // Detect query intent for specific country/product
  const queryCountry = 
    /\bsweden|swedish|se\b/i.test(query) ? 'Sweden' :
    /\bnorway|norwegian|no\b/i.test(query) ? 'Norway' :
    undefined;
  
  const queryProduct =
    /\bmobile sdk|android|ios\b/i.test(query) ? 'Mobile SDK' :
    /\bbankid\b/i.test(query) ? 'BankID' :
    undefined;
  
  // If query is specific, prefer matching documents
  if (queryCountry || queryProduct) {
    console.log(`🌍 [Conflict Resolver] Query specific: country=${queryCountry}, product=${queryProduct}`);
    
    return results.map(r => {
      let boost = 1.0;
      
      // Boost matching country
      if (queryCountry && r.docCountry === queryCountry) {
        boost *= 1.4; // 40% boost for matching country
      }
      
      // Boost matching product
      if (queryProduct && r.docProduct === queryProduct) {
        boost *= 1.2; // 20% boost for matching product
      }
      
      // Penalize wrong country (prevent bleed)
      if (queryCountry && r.docCountry && r.docCountry !== queryCountry) {
        boost *= 0.6; // 40% penalty for wrong country
      }
      
      return {
        ...r,
        finalScore: (r.finalScore || 0) * boost
      };
    }).sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  }
  
  // No specific intent - return as-is
  console.log(`🌍 [Conflict Resolver] Query generic - no country/product preference`);
  return results;
}

/**
 * Add document labels to source chips
 * Format: "BankID Sweden Guide v5 (Page 12)"
 */
export interface SourceChipData {
  title: string;
  page?: number;
  chunkId?: string;
  sectionPath?: string | null;
  sourceParagraph: string;
  // New fields for cross-doc clarity
  docLabel?: string;
  docCountry?: string;
  docProduct?: string;
}

export function formatSourceChip(source: SourceChipData): {
  displayText: string;
  tooltip: string;
} {
  let displayText = source.docLabel || source.title;
  
  // Add country/product prefix if available
  if (source.docCountry) {
    displayText = `${source.docCountry}: ${displayText}`;
  }
  
  // Add page number
  if (source.page) {
    displayText += ` (p${source.page})`;
  }
  
  // Build tooltip
  const tooltip = [
    source.docLabel || source.title,
    source.page ? `Page ${source.page}` : null,
    source.sectionPath ? `Section: ${source.sectionPath}` : null
  ].filter(Boolean).join(' • ');
  
  return { displayText, tooltip };
}

/**
 * Group results by document for presentation
 * Useful for showing "Sources used: Sweden Guide (3 chunks), Norway Guide (2 chunks)"
 */
export function groupByDocument<T extends { 
  documentId?: string;
  document_id?: string;
  docLabel?: string;
}>(results: T[]): Map<string, { label: string; count: number; results: T[] }> {
  const groups = new Map<string, { label: string; count: number; results: T[] }>();
  
  for (const result of results) {
    const docId = result.documentId || result.document_id || 'unknown';
    
    if (!groups.has(docId)) {
      groups.set(docId, {
        label: result.docLabel || docId.substring(0, 8),
        count: 0,
        results: []
      });
    }
    
    const group = groups.get(docId)!;
    group.count++;
    group.results.push(result);
  }
  
  return groups;
}

/**
 * Format source summary for display
 * Example: "Sources: BankID Sweden Guide (5), BankID Norway Guide (2), Mobile SDK (1)"
 */
export function formatSourceSummary<T extends { 
  documentId?: string;
  document_id?: string;
  docLabel?: string;
}>(results: T[]): string {
  const groups = groupByDocument(results);
  
  const summaries = Array.from(groups.values())
    .map(g => `${g.label} (${g.count})`)
    .join(', ');
  
  return `Sources: ${summaries}`;
}

/**
 * Complete cross-document retrieval pipeline
 */
export async function retrieveWithCrossDocMerge(
  candidates: Candidate[],
  query: string,
  options: CrossDocOptions = {}
): Promise<Candidate[]> {
  console.log(`🌍 [Cross-Doc] Processing ${candidates.length} candidates`);
  
  // Step 1: Per-doc capping
  const capped = perDocCapMerge(candidates, options);
  
  // Step 2: Resolve conflicts (locale/product bleed)
  const resolved = resolveConflicts(capped as any, query) as Candidate[];
  
  console.log(`✅ [Cross-Doc] Final: ${resolved.length} candidates`);
  
  return resolved;
}

