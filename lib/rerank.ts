// lib/rerank.ts
export type NormalizedContext = {
  title: string
  chunkIndex: number
  content: string
  sourceId?: string
  page?: number
  id?: string
}

const SDK_TERMS = [
  'sdk','gradle','implementation','dependencies','cocoapods','pod ',
  'android','ios','kotlin','swift','manifest','uses-permission',
  'initialize','init','apikey','api key','config','plist','proguard',
  'minSdk','targetSdk'
];

function asciiPrintableRatio(s: string): number {
  if (!s) return 0;
  let printable = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 32 && c <= 126) printable++;
  }
  return printable / s.length;
}

function letterRatio(s: string): number {
  if (!s) return 0;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  return letters / s.length;
}

export function isJunkText(s: string): boolean {
  if (!s) return true;
  const len = s.length;
  const printable = asciiPrintableRatio(s);
  const letters = letterRatio(s);
  
  // Allow SDK keywords to bypass borderline ratios
  const hasSDKKeywords = SDK_TERMS.some(term => s.toLowerCase().includes(term));
  
  // Treat as junk if very short OR mostly non-printable OR almost no letters (unless SDK keywords present)
  return len < 80 || printable < 0.55 || (letters < 0.20 && !hasSDKKeywords);
}

function wordOverlapScore(q: string, c: string): number {
  const qWords = new Set(q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const cWords = new Set(c.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (!qWords.size || !cWords.size) return 0;
  let overlap = 0;
  for (const w of Array.from(qWords)) if (cWords.has(w)) overlap++;
  return Math.min(3, overlap / Math.max(1, Math.sqrt(cWords.size)) * 3);
}

/**
 * Detects if content contains table-like structures
 */
function isTableLikeContent(content: string): boolean {
  const lines = content.split('\n');
  let pipeLines = 0;
  let spacedLines = 0;
  
  for (const line of lines) {
    if (line.includes('|')) pipeLines++;
    if (line.match(/\s{4,}/)) spacedLines++; // 4+ consecutive spaces
  }
  
  const hasTableKeywords = /\b(table|flow|step|feature|comparison|versus|vs\.?)\b/i.test(content);
  const hasHighPipeRatio = pipeLines / Math.max(1, lines.length) > 0.3;
  const hasHighSpaceRatio = spacedLines / Math.max(1, lines.length) > 0.4;
  
  return hasTableKeywords || hasHighPipeRatio || hasHighSpaceRatio;
}

function exactTermBoost(q: string, c: string): number {
  // Critical BankID terms that need hard boosts for small, named facts
  const exactTerms = [
    // Base URLs and endpoints
    'test', 'prod', 'gateway', 'base url', '/api/ping', 'test-gateway', 'prod-gateway',
    // Headers and authentication
    'header', 'authorization', 'zs-product-key', 'bearer token',
    // Scopes and assurance levels
    'scope', 'bankid.no.high', 'bankid.no.substantial', 'nnin', 'nnin_altsub', 'consent',
    // User interactions
    'cancel', 'cancellation', 'callback', 'redirect', 'user aborted', 'user cancellation',
    // Logo and branding
    'logo', '300x60', '300 x 60', '10kb', '10kb', 'png', 'svg', 'branding',
    // General BankID terms
    'bankid', 'signing', 'environment', 'sandbox', 'production'
  ];
  
  const lowerQuery = q.toLowerCase();
  const lowerContent = c.toLowerCase();
  let boost = 0;
  
  // Table/Flow boost: if query asks for table/flow/comparison and content has table structure
  const isTableQuery = /\b(table|flow|compare|comparison|versus|vs\.?|list|recreate|reformat)\b/i.test(q);
  if (isTableQuery && isTableLikeContent(c)) {
    boost += 0.05; // Small rerank bonus
  }
  
  for (const term of exactTerms) {
    if (lowerQuery.includes(term) && lowerContent.includes(term)) {
      // Higher boost for critical technical terms
      if (['test', 'prod', 'gateway', 'base url', 'scope', 'nnin', 'callback', 'logo'].includes(term)) {
        boost += 0.8;
      } else {
        boost += 0.5;
      }
    }
  }
  
  return Math.min(boost, 3); // Increased max boost for critical terms
}

function sdkBoost(c: string): number {
  const L = c.toLowerCase();
  let score = 0;
  for (const t of SDK_TERMS) if (L.includes(t)) score += 0.6;
  if (/```(kotlin|swift|gradle|groovy|ruby|xml|json|yaml)?/i.test(c)) score += 1.5;
  if (/ZignSec/i.test(c)) score += 0.7;
  return Math.min(score, 4);
}

export function rerankAndPrune(
  question: string,
  items: NormalizedContext[],
  limit = 4
): NormalizedContext[] {
  // 1) remove junk
  const cleaned = items.filter(i => !isJunkText(i.content));

  // 2) de-dupe by title|chunkIndex|first 100 chars
  const seen = new Set<string>();
  const deduped: NormalizedContext[] = [];
  for (const it of cleaned) {
    const key = `${it.title}|${it.chunkIndex}|${it.content.slice(0, 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(it);
    }
  }

  // 3) score + sort with exact term boost
  const scored = deduped
    .map(it => {
      const base = wordOverlapScore(question, it.content);
      const sdkBoostScore = sdkBoost(it.content);
      const exactBoost = exactTermBoost(question, it.content);
      return { it, score: base + sdkBoostScore + exactBoost };
    })
    .sort((a, b) => b.score - a.score);

  // 4) Promote document diversity - ensure we get chunks from different documents
  const diversified: NormalizedContext[] = [];
  const documentCounts = new Map<string, number>();
  const maxPerDocument = Math.ceil(limit / 2); // Allow up to half the limit per document
  
  for (const item of scored) {
    const docTitle = item.it.title;
    const currentCount = documentCounts.get(docTitle) || 0;
    
    // Add chunk if we haven't exceeded the per-document limit
    if (currentCount < maxPerDocument) {
      diversified.push(item.it);
      documentCounts.set(docTitle, currentCount + 1);
      
      if (diversified.length >= limit) break;
    }
  }
  
  // If we still haven't reached the limit, add remaining high-scoring chunks
  if (diversified.length < limit) {
    for (const item of scored) {
      if (!diversified.includes(item.it)) {
        diversified.push(item.it);
        if (diversified.length >= limit) break;
      }
    }
  }

  return diversified;
}