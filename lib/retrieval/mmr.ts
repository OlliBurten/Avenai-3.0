/**
 * MMR (Maximal Marginal Relevance) for diversity
 * Ensures variety in retrieval results by limiting per-page and ensuring section coverage
 */

import { Candidate } from './hybrid';

export interface MMROptions {
  maxReturn?: number;      // Maximum results to return (default: 12)
  maxPerPage?: number;      // Max chunks per page (default: 2)
  minSections?: number;     // Minimum unique sections required (default: 3)
}

/**
 * Apply MMR diversity constraints
 * - Cap 2 chunks per page
 * - Ensure ≥3 distinct sections
 * - Maintain score ordering
 */
export function mmrDiverse(
  candidates: Candidate[],
  options: MMROptions = {}
): Candidate[] {
  const {
    maxReturn = 12,
    maxPerPage = 2,
    minSections = 3
  } = options;

  const selected: Candidate[] = [];
  const perPage = new Map<number, number>();
  const sections = new Set<string>();

  for (const candidate of candidates) {
    // Check page constraint
    const page = candidate.page ?? -1;
    const pageCount = perPage.get(page) || 0;
    
    if (pageCount >= maxPerPage) {
      // Skip - already have enough from this page
      continue;
    }

    // Add to selected
    selected.push(candidate);
    perPage.set(page, pageCount + 1);
    
    // Track section
    if (candidate.section_path) {
      sections.add(candidate.section_path);
    }

    // Check if we've met our goals
    if (selected.length >= maxReturn && sections.size >= minSections) {
      break;
    }
  }

  console.log(`📊 [MMR] Selected ${selected.length}/${candidates.length} candidates | ${sections.size} sections | ${perPage.size} pages`);

  return selected;
}

/**
 * Apply MMR diversity to HybridResults
 */
export function mmrDiverseResults<T extends { page?: number; sectionPath?: string | null }>(
  results: T[],
  options: MMROptions = {}
): T[] {
  const {
    maxReturn = 12,
    maxPerPage = 2,
    minSections = 3
  } = options;

  const selected: T[] = [];
  const perPage = new Map<number, number>();
  const sections = new Set<string>();

  for (const result of results) {
    // Check page constraint
    const page = result.page ?? -1;
    const pageCount = perPage.get(page) || 0;
    
    if (pageCount >= maxPerPage) {
      continue;
    }

    // Add to selected
    selected.push(result);
    perPage.set(page, pageCount + 1);
    
    // Track section
    if (result.sectionPath) {
      sections.add(result.sectionPath);
    }

    // Check if we've met our goals
    if (selected.length >= maxReturn && sections.size >= minSections) {
      break;
    }
  }

  console.log(`📊 [MMR] Selected ${selected.length}/${results.length} results | ${sections.size} sections | ${perPage.size} pages`);

  return selected;
}

/**
 * Aggressive diversity mode - maximize section coverage
 * Takes top N from each document/section
 */
export function mmrAggressiveDiversity<T extends { documentId: string; sectionPath?: string | null }>(
  results: T[],
  options: {
    maxPerDocument?: number;
    maxPerSection?: number;
    totalMax?: number;
  } = {}
): T[] {
  const {
    maxPerDocument = 3,
    maxPerSection = 2,
    totalMax = 12
  } = options;

  const selected: T[] = [];
  const perDocument = new Map<string, number>();
  const perSection = new Map<string, number>();

  for (const result of results) {
    // Check document constraint
    const docCount = perDocument.get(result.documentId) || 0;
    if (docCount >= maxPerDocument) {
      continue;
    }

    // Check section constraint
    const section = result.sectionPath || 'unknown';
    const sectionCount = perSection.get(section) || 0;
    if (sectionCount >= maxPerSection) {
      continue;
    }

    // Add to selected
    selected.push(result);
    perDocument.set(result.documentId, docCount + 1);
    perSection.set(section, sectionCount + 1);

    if (selected.length >= totalMax) {
      break;
    }
  }

  console.log(`📊 [MMR Aggressive] Selected ${selected.length}/${results.length} | ${perDocument.size} docs | ${perSection.size} sections`);

  return selected;
}

