// lib/chat/retrieval-policy.ts
// Adaptive retrieval strategies based on query intent

import { detectIntent, Intent } from './intent';

// Re-export Intent for consumers
export type { Intent };

export interface MetadataFilter {
  key: string;
  op: 'eq' | 'ilike' | 'exists';
  value?: string;
}

export interface SearchPlan {
  k: number;
  must?: MetadataFilter[];
  prefer?: 'footer' | 'table' | 'json' | null;
  description?: string;
}

/**
 * Generate intent-aware search plan with metadata filters
 */
export function planForIntent(intent: Intent): SearchPlan {
  switch (intent) {
    case 'JSON':
    case 'IDKEY':
      return {
        k: 25,
        must: [{ key: 'hasJson', op: 'eq', value: 'true' }],
        prefer: 'json',
        description: 'JSON-focused with hasJson filter'
      };
    
    case 'ENDPOINT':
      return {
        k: 25,
        must: [{ key: 'element_type', op: 'eq', value: 'paragraph' }],
        prefer: null,
        description: 'Endpoint-focused with paragraph filter'
      };
    
    case 'TABLE':
      return {
        k: 25,
        must: [{ key: 'element_type', op: 'eq', value: 'table' }],
        prefer: 'table',
        description: 'Table-focused with element_type filter'
      };
    
    case 'CONTACT':
      return {
        k: 25,
        must: [],
        prefer: 'footer',
        description: 'Contact-focused with footer preference'
      };
    
    case 'WORKFLOW':
    case 'DEFAULT':
    default:
      return {
        k: 25,
        must: [],
        prefer: null,
        description: 'Standard semantic search'
      };
  }
}

/**
 * Generate retrieval plan(s) based on query intent
 * Returns multiple strategies to try in sequence (with fallback)
 */
export function planFor(query: string): SearchPlan[] {
  const intent = detectIntent(query);
  
  console.log(`🎯 Intent detected: ${intent} for query: "${query.substring(0, 60)}..."`);
  
  const primary = planForIntent(intent);
  
  // Always include an unfiltered fallback pass
  const fallback: SearchPlan = {
    k: 25,
    must: [],
    prefer: null,
    description: 'Unfiltered fallback'
  };
  
  return [primary, fallback];
}

/**
 * Get minimum required sections based on intent
 */
export function getMinSections(intent: Intent): number {
  switch (intent) {
    case 'JSON':
      return 1; // JSON blocks rarely have section headers
    case 'CONTACT':
      return 1; // Footer/contact info rarely has sections
    case 'WORKFLOW':
      return 2; // Workflows should span multiple sections
    default:
      return 2;
  }
}
