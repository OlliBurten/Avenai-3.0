/**
 * Soft-Filter Retriever Policy
 * Intent-aware boosting without aggressive filtering
 * Ensures we always have results, even if they don't perfectly match the intent
 */

import { Candidate } from './hybrid';

export type Intent = 
  | 'JSON' 
  | 'TABLE' 
  | 'CONTACT' 
  | 'ENDPOINT' 
  | 'WORKFLOW' 
  | 'ONE_LINE'
  | 'ERROR_CODE'
  | 'DEFAULT';

export interface PolicyOptions {
  minPreferred?: number;    // Minimum preferred hits before fallback (default: 3)
  fallbackCount?: number;   // How many non-preferred to include (default: 6)
  boostAmount?: number;     // Score boost for preferred items (default: 0.15)
}

/**
 * Apply intent-aware policy to candidates
 * Soft filtering: prefer matching content, but don't exclude others
 */
export function applyPolicy(
  intent: Intent,
  candidates: Candidate[],
  options: PolicyOptions = {}
): Candidate[] {
  const {
    minPreferred = 3,
    fallbackCount = 6,
    boostAmount = 0.15
  } = options;

  /**
   * Prefer candidates matching predicate
   * If ≥3 matches: return matches + some non-matches
   * If <3 matches: boost matching items, keep all
   */
  const prefer = (
    predicate: (c: Candidate) => boolean,
    boostScore: number = boostAmount
  ): Candidate[] => {
    const matches = candidates.filter(predicate);
    const nonMatches = candidates.filter(c => !predicate(c));

    if (matches.length >= minPreferred) {
      // We have enough matches - prefer them but include some context
      console.log(`   ✅ Found ${matches.length} preferred candidates for ${intent}`);
      return [
        ...matches,
        ...nonMatches.slice(0, fallbackCount)
      ];
    }

    // Not enough matches - boost what we have, keep everything
    console.log(`   ⚠️ Only ${matches.length} preferred candidates, applying boost for ${intent}`);
    return candidates.map(c => 
      predicate(c)
        ? { ...c, finalScore: c.finalScore + boostScore }
        : c
    ).sort((a, b) => b.finalScore - a.finalScore);
  };

  console.log(`🎯 [Policy] Applying ${intent} policy to ${candidates.length} candidates`);

  switch (intent) {
    case 'JSON': {
      // Prefer chunks with JSON-like content
      // Patterns: "key": value, {...}, [...]
      return prefer(c => {
        const hasJsonObject = /\{[\s\S]*?\}/.test(c.content);
        const hasJsonArray = /\[[\s\S]*?\]/.test(c.content);
        const hasJsonPairs = /"[\w\-\s]+"\s*:/.test(c.content);
        const hasVerbatim = c.metadata?.has_verbatim === true;
        
        return hasJsonObject || hasJsonArray || hasJsonPairs || hasVerbatim;
      }, 0.20); // Higher boost for JSON (critical for exact matches)
    }

    case 'TABLE': {
      // Prefer chunks with table-like content
      // Patterns: | col1 | col2 |, markdown tables
      return prefer(c => {
        const hasPipes = /\|.+\|/.test(c.content);
        const hasTableMd = c.metadata?.table_md != null;
        const isTableElement = c.metadata?.element_type === 'table';
        
        return hasPipes || hasTableMd || isTableElement;
      }, 0.18);
    }

    case 'CONTACT': {
      // Boost chunks with contact info
      // Always soft (don't hard-filter contact info)
      return candidates.map(c => {
        const hasEmail = /@/.test(c.content);
        const hasContactKeywords = /Contact|Support|Help|Email|Info/i.test(c.content);
        const isFooter = c.metadata?.element_type === 'footer';
        const hasEmailMeta = c.metadata?.emails && Array.isArray(c.metadata.emails);
        
        if (hasEmail || isFooter || hasEmailMeta) {
          return { ...c, finalScore: c.finalScore + 0.25 }; // High boost
        } else if (hasContactKeywords) {
          return { ...c, finalScore: c.finalScore + 0.10 }; // Lower boost
        }
        return c;
      }).sort((a, b) => b.finalScore - a.finalScore);
    }

    case 'ENDPOINT': {
      // Boost chunks with HTTP endpoints
      // Patterns: GET /path, POST /path, etc.
      return candidates.map(c => {
        const hasEndpointPattern = /^(GET|POST|PUT|PATCH|DELETE)\s+\//m.test(c.content);
        const hasEndpointMeta = c.metadata?.endpoint != null;
        const hasUrlPattern = /https?:\/\/[^\s]+\/[^\s]+/.test(c.content);
        
        if (hasEndpointPattern || hasEndpointMeta) {
          return { ...c, finalScore: c.finalScore + 0.15 };
        } else if (hasUrlPattern) {
          return { ...c, finalScore: c.finalScore + 0.08 };
        }
        return c;
      }).sort((a, b) => b.finalScore - a.finalScore);
    }

    case 'ERROR_CODE': {
      // Boost chunks with error codes
      // Patterns: ALL_CAPS_ERROR, error codes, HTTP status codes
      return candidates.map(c => {
        const hasErrorCode = /\b[A-Z_]{3,}\b/.test(c.content); // ALL_CAPS pattern
        const hasHttpStatus = /\b(4\d{2}|5\d{2})\b/.test(c.content); // 4xx, 5xx
        const hasErrorKeywords = /error|exception|fail|invalid/i.test(c.content);
        
        if (hasErrorCode && hasErrorKeywords) {
          return { ...c, finalScore: c.finalScore + 0.18 };
        } else if (hasErrorCode || hasHttpStatus) {
          return { ...c, finalScore: c.finalScore + 0.10 };
        }
        return c;
      }).sort((a, b) => b.finalScore - a.finalScore);
    }

    case 'ONE_LINE': {
      // For technical spec queries (auth headers, params, etc.)
      // Boost chunks with structured technical content
      return candidates.map(c => {
        const hasCodeBlock = /```/.test(c.content);
        const hasHttpHeaders = /(Authorization|Content-Type|Accept|API-Key):/i.test(c.content);
        const hasVerbatim = c.metadata?.has_verbatim === true;
        const hasEndpoint = c.metadata?.endpoint != null;
        
        if (hasHttpHeaders || hasVerbatim) {
          return { ...c, finalScore: c.finalScore + 0.15 };
        } else if (hasCodeBlock || hasEndpoint) {
          return { ...c, finalScore: c.finalScore + 0.10 };
        }
        return c;
      }).sort((a, b) => b.finalScore - a.finalScore);
    }

    case 'WORKFLOW': {
      // For workflow queries, diversity is more important than filtering
      // MMR will handle section diversity, so don't filter here
      console.log(`   ℹ️ WORKFLOW: No filtering, relying on MMR for diversity`);
      return candidates;
    }

    case 'DEFAULT':
    default: {
      // No specific intent - return as-is
      console.log(`   ℹ️ ${intent}: No policy applied`);
      return candidates;
    }
  }
}

/**
 * Extract intent from query
 * Simple heuristic-based detection
 */
export function detectIntent(query: string): Intent {
  const q = query.toLowerCase();

  // JSON intent
  if (/\b(json|sample|example|request|response|body|payload)\b/.test(q) && 
      (/\b(show|give|return|provide|format|structure)\b/.test(q) || /\?$/.test(query))) {
    return 'JSON';
  }

  // TABLE intent
  if (/\b(table|list|comparison|matrix)\b/.test(q)) {
    return 'TABLE';
  }

  // CONTACT intent
  if (/\b(contact|email|support|help|reach)\b/.test(q)) {
    return 'CONTACT';
  }

  // ENDPOINT intent
  if (/\b(endpoint|api|url|route|path|method)\b/.test(q) || 
      /(GET|POST|PUT|DELETE|PATCH)/.test(query)) {
    return 'ENDPOINT';
  }

  // ERROR_CODE intent
  if (/\b(error|exception|fail|code|status)\b/.test(q)) {
    return 'ERROR_CODE';
  }

  // ONE_LINE intent (headers, params, specific values)
  if (/\b(header|param|field|value|token|key)\b/.test(q) && 
      /\b(which|what|required|needed)\b/.test(q)) {
    return 'ONE_LINE';
  }

  // WORKFLOW intent
  if (/\b(how|step|process|flow|guide|setup|configure|integrate)\b/.test(q)) {
    return 'WORKFLOW';
  }

  return 'DEFAULT';
}

/**
 * Apply policy and log results
 */
export function applyPolicyWithLogging(
  intent: Intent,
  candidates: Candidate[],
  options?: PolicyOptions
): Candidate[] {
  const before = candidates.slice(0, 3).map(c => ({
    id: c.id.substring(0, 8),
    score: c.finalScore.toFixed(4)
  }));

  const result = applyPolicy(intent, candidates, options);

  const after = result.slice(0, 3).map(c => ({
    id: c.id.substring(0, 8),
    score: c.finalScore.toFixed(4)
  }));

  console.log(`   📊 Before policy: ${JSON.stringify(before)}`);
  console.log(`   📊 After policy:  ${JSON.stringify(after)}`);

  return result;
}
