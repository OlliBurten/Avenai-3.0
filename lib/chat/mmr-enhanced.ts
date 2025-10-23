// lib/chat/mmr-enhanced.ts
// Enhanced MMR with page/section diversity constraints

import { Intent } from './intent';
import { getMinSections } from './retrieval-policy';

export interface MMRChunk {
  id: string;
  content: string;
  score: number;
  page?: number;
  sectionPath?: string | null;
  [key: string]: any;
}

export interface MMRConfig {
  lambda: number;        // Relevance vs diversity tradeoff (0-1)
  maxPerPage: number;    // Max chunks from same page
  minSections: number;   // Min unique sections required
  maxResults: number;    // Total results to return
}

const DEFAULT_CONFIG: MMRConfig = {
  lambda: 0.7,           // 70% relevance, 30% diversity
  maxPerPage: 2,         // Max 2 chunks per page
  minSections: 3,        // At least 3 different sections
  maxResults: 15
};

/**
 * Enhanced MMR with page and section diversity constraints
 * Balances relevance with diversity across pages and sections
 */
export function enhancedMMR(
  chunks: MMRChunk[],
  intent: Intent,
  config: Partial<MMRConfig> = {}
): MMRChunk[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Adjust constraints based on intent
  if (intent === 'WORKFLOW') {
    cfg.minSections = 3;
    cfg.maxPerPage = 2;
    cfg.maxResults = 20;  // More context for workflows
  } else if (['TABLE', 'JSON', 'IDKEY'].includes(intent)) {
    cfg.minSections = 2;
    cfg.maxPerPage = 3;   // Allow more from same page for structured data
  }
  
  console.log('🎯 Enhanced MMR:', {
    inputChunks: chunks.length,
    intent,
    config: cfg
  });
  
  const selected: MMRChunk[] = [];
  const remaining = [...chunks];
  
  // Track page and section usage
  const pageCounts = new Map<number, number>();
  const sectionCounts = new Map<string, number>();
  const sectionsUsed = new Set<string>();
  
  while (selected.length < cfg.maxResults && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const page = candidate.page || 0;
      const section = candidate.sectionPath || 'unknown';
      
      // Check page constraint
      const pageCount = pageCounts.get(page) || 0;
      if (pageCount >= cfg.maxPerPage) {
        continue;  // Skip - too many from this page
      }
      
      // Calculate relevance score
      const relevanceScore = candidate.score;
      
      // Calculate diversity bonus
      let diversityBonus = 0;
      
      // Bonus for new section
      if (section !== 'unknown' && !sectionsUsed.has(section)) {
        diversityBonus += 0.2;
      }
      
      // Bonus for new page
      if (page > 0 && !pageCounts.has(page)) {
        diversityBonus += 0.1;
      }
      
      // Combined score with lambda weighting
      const mmrScore = (cfg.lambda * relevanceScore) + ((1 - cfg.lambda) * diversityBonus);
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }
    
    // If no valid candidate found, break
    if (bestIdx === -1) {
      break;
    }
    
    // Select best candidate
    const selected_chunk = remaining.splice(bestIdx, 1)[0];
    selected.push(selected_chunk);
    
    // Update tracking
    const page = selected_chunk.page || 0;
    const section = selected_chunk.sectionPath || 'unknown';
    
    pageCounts.set(page, (pageCounts.get(page) || 0) + 1);
    sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
    if (section !== 'unknown') {
      sectionsUsed.add(section);
    }
  }
  
  // Calculate diversity metrics
  const uniquePages = new Set(selected.map(c => c.page).filter(p => p && p > 0)).size;
  const uniqueSections = sectionsUsed.size;
  
  console.log('✅ Enhanced MMR complete:', {
    selectedChunks: selected.length,
    uniquePages,
    uniqueSections,
    meetsMinSections: uniqueSections >= cfg.minSections,
    pageDistribution: Object.fromEntries(pageCounts),
    sectionDistribution: Object.fromEntries(
      Array.from(sectionCounts.entries())
        .map(([s, count]) => [s.substring(0, 30), count])
    )
  });
  
  // Warning if section diversity requirement not met
  if (uniqueSections < cfg.minSections) {
    console.warn(`⚠️  Section diversity below minimum: ${uniqueSections} < ${cfg.minSections}`);
  }
  
  return selected;
}

/**
 * Page diversity check - trigger secondary recall if needed
 */
export function needsPageDiversityBoost(chunks: MMRChunk[]): boolean {
  const pages = chunks.map(c => c.page).filter(p => p && p > 0);
  const uniquePages = new Set(pages);
  
  // If >60% from same page, need boost
  if (pages.length > 0) {
    const maxPageConcentration = Math.max(
      ...Array.from(uniquePages).map(page =>
        pages.filter(p => p === page).length / pages.length
      )
    );
    
    return maxPageConcentration > 0.6;
  }
  
  return false;
}

/**
 * Section diversity check - trigger fallback if needed
 */
export function needsSectionDiversityBoost(
  chunks: MMRChunk[],
  minSections: number
): boolean {
  const sections = chunks
    .map(c => c.sectionPath)
    .filter(s => s && s.trim().length > 0);
  
  const uniqueSections = new Set(sections).size;
  
  return uniqueSections < minSections;
}

