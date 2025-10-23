// lib/chat/synonym-expansion.ts
// Typo and synonym expansion for better field name matching

export interface SynonymMap {
  [key: string]: string[];
}

// Common API field name synonyms and typos
const FIELD_SYNONYMS: SynonymMap = {
  // Destination merchant group ID variations
  'destinationMerchantGroupId': [
    'destinashunMerchantGroupId', // Common typo
    'destinationMerchantGroup', 
    'merchantGroupId',
    'destMerchantGroupId',
    'destGroupId',
    'merchantGroup',
    'groupId'
  ],
  
  // Action reasons variations
  'action-reasons': [
    'actionreasons',
    'action_reasons',
    'action reasons',
    'reasons',
    'action-reason'
  ],
  
  // Boarding case variations
  'boarding-case': [
    'boardingcase',
    'boarding_case',
    'boarding case',
    'onboarding-case',
    'onboardingcase',
    'onboarding_case',
    'onboarding case'
  ],
  
  // Risk evaluation variations
  'risk-evaluation': [
    'riskevaluation',
    'risk_evaluation',
    'risk evaluation',
    'riskassessment',
    'risk_assessment',
    'risk assessment'
  ],
  
  // Context parameter variations
  'GLOBAL_ONBOARDING_NEW_MERCHANT': [
    'global_onboarding_new_merchant',
    'globalOnboardingNewMerchant',
    'new_merchant',
    'newmerchant',
    'new merchant',
    'onboarding_new'
  ],
  
  'GLOBAL_ONBOARDING_EXISTING_MERCHANT': [
    'global_onboarding_existing_merchant',
    'globalOnboardingExistingMerchant',
    'existing_merchant',
    'existingmerchant',
    'existing merchant',
    'onboarding_existing'
  ],
  
  // HTTP methods
  'GET': ['get', 'Get'],
  'POST': ['post', 'Post'],
  'PUT': ['put', 'Put'],
  'DELETE': ['delete', 'Delete'],
  
  // Common field names
  'merchantName': [
    'merchant_name',
    'merchantname',
    'merchant name',
    'name',
    'merchant'
  ],
  
  'urlString': [
    'url_string',
    'urlstring',
    'url string',
    'url',
    'website'
  ],
  
  'primaryMerchantContactName': [
    'primary_merchant_contact_name',
    'primarymerchantcontactname',
    'primary merchant contact name',
    'contact_name',
    'contactname',
    'contact name',
    'primaryContact',
    'primary_contact'
  ],
  
  'merchantDBA': [
    'merchant_dba',
    'merchantdba',
    'merchant dba',
    'dba',
    'doing_business_as',
    'doingbusinessas',
    'doing business as'
  ],
  
  // Action types
  'APPROVED': [
    'approved',
    'Approved',
    'approve',
    'Approve'
  ],
  
  'TERMINATED': [
    'terminated',
    'Terminated',
    'terminate',
    'Terminate',
    'terminated reason',
    'termination reason',
    'terminated reasons',
    'termination reasons'
  ],
  
  // Reason ID variations
  'reasonId': [
    'reason_id',
    'reasonid',
    'reason id',
    'reason ID',
    'reasonID',
    'reason-id'
  ],
  
  // Action ID variations
  'actionId': [
    'action_id',
    'actionid',
    'action id',
    'action ID',
    'actionID',
    'action-id'
  ],
  
  // Contact email
  'clientservices@g2risksolutions.com': [
    'clientservices@',
    'client services',
    'contact email',
    'support email',
    'g2 email',
    'g2risksolutions email'
  ],
  
  // Sample response keywords
  'sample': [
    'example',
    'sample response',
    'example response',
    'response example',
    'sample JSON',
    'example JSON'
  ],
  
  // Status codes
  'COMPLETED': [
    'completed',
    'Completed',
    'complete',
    'Complete',
    'done',
    'Done'
  ],
  
  'PENDING': [
    'pending',
    'Pending',
    'waiting',
    'Waiting'
  ],
  
  'FAILED': [
    'failed',
    'Failed',
    'error',
    'Error',
    'failed',
    'Failed'
  ]
};

// Phonetic similarity for common typos
const PHONETIC_MAP: { [key: string]: string } = {
  'destinashun': 'destination',
  'destinashon': 'destination',
  'destinasion': 'destination',
  'destanation': 'destination',
  'destinaton': 'destination',
  'destiantion': 'destination',
  'destinaton': 'destination',
  
  'merchent': 'merchant',
  'merhant': 'merchant',
  'merchnat': 'merchant',
  'merhcant': 'merchant',
  
  'onbording': 'onboarding',
  'onboading': 'onboarding',
  'onborading': 'onboarding',
  'onborading': 'onboarding',
  
  'evaluatin': 'evaluation',
  'evalution': 'evaluation',
  'evalation': 'evaluation',
  'evalaution': 'evaluation'
};

/**
 * Expand query with synonyms and fix common typos
 */
export function expandQueryWithSynonyms(query: string): string {
  let expandedQuery = query;
  
  // Fix common typos first
  expandedQuery = fixCommonTypos(expandedQuery);
  
  // Add synonyms for known field names and terms
  expandedQuery = addSynonyms(expandedQuery);
  
  return expandedQuery;
}

/**
 * Fix common typos using phonetic similarity + regex patterns
 */
function fixCommonTypos(query: string): string {
  let fixedQuery = query;
  
  // Apply phonetic fixes
  for (const [typo, correct] of Object.entries(PHONETIC_MAP)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    fixedQuery = fixedQuery.replace(regex, correct);
  }
  
  // Apply regex-based normalizations for critical field names
  const regexNormalizations = [
    {
      pattern: /destin(a|e)shun[_\s-]?merchant[_\s-]?group[_\s-]?id/gi,
      replacement: 'destinationMerchantGroupId'
    },
    {
      pattern: /destination[_\s-]?merchant[_\s-]?group[_\s-]?id/gi,
      replacement: 'destinationMerchantGroupId'
    },
    {
      pattern: /reason[_\s-]?id/gi,
      replacement: 'reasonId'
    },
    {
      pattern: /action[_\s-]?id/gi,
      replacement: 'actionId'
    },
    {
      pattern: /case[_\s-]?id/gi,
      replacement: 'caseId'
    },
    {
      pattern: /merchant[_\s-]?name/gi,
      replacement: 'merchantName'
    },
    {
      pattern: /url[_\s-]?string/gi,
      replacement: 'urlString'
    }
  ];
  
  for (const { pattern, replacement } of regexNormalizations) {
    fixedQuery = fixedQuery.replace(pattern, replacement);
  }
  
  return fixedQuery;
}

/**
 * Add synonyms to query for better matching
 */
function addSynonyms(query: string): string {
  const words = query.split(/\s+/);
  const expandedWords: string[] = [];
  
  for (const word of words) {
    // Clean word for matching
    const cleanWord = word.replace(/[^\w]/g, '');
    
    // Check if word has synonyms
    let hasSynonyms = false;
    for (const [canonical, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (synonyms.some(syn => syn.toLowerCase() === cleanWord.toLowerCase()) ||
          canonical.toLowerCase() === cleanWord.toLowerCase()) {
        // Add the canonical form and some synonyms
        expandedWords.push(canonical);
        expandedWords.push(...synonyms.slice(0, 2)); // Add first 2 synonyms
        hasSynonyms = true;
        break;
      }
    }
    
    // If no synonyms found, keep original word
    if (!hasSynonyms) {
      expandedWords.push(word);
    }
  }
  
  return expandedWords.join(' ');
}

/**
 * Detect if query should prefer table/structured data
 */
export function shouldPreferTables(query: string): boolean {
  const tableIndicators = [
    /\bID\b/i,
    /\bIDs\b/i,
    /\breasonId\b/i,
    /\bactionId\b/i,
    /\bcaseId\b/i,
    /\bterminated\s+reason/i,
    /\baction-reasons\b/i,
    /\blist\s+(all|the|three)\b/i,
    /\bsample\s+data\b/i,
    /\bexample\s+values\b/i
  ];
  
  return tableIndicators.some(pattern => pattern.test(query));
}

/**
 * Detect if query should prefer BM25 over embeddings
 */
export function shouldPreferKeyword(query: string): boolean {
  const keywordIndicators = [
    /\/v\d+\/[a-z\-\/\{\}]+/i,  // API paths
    /\b[A-Z_]{3,}\b/,  // ALL_CAPS enums
    /\b(GET|POST|PUT|DELETE)\b/i,  // HTTP methods
    /\breasonId\b/i,
    /\bactionId\b/i,
    /\bcaseId\b/i,
    /\bdestinationMerchantGroupId\b/i
  ];
  
  return keywordIndicators.some(pattern => pattern.test(query));
}

/**
 * Extract API-specific terms from query for targeted expansion
 */
export function extractApiTerms(query: string): {
  endpoints: string[];
  methods: string[];
  fields: string[];
  actions: string[];
  contexts: string[];
} {
  const terms = {
    endpoints: [] as string[],
    methods: [] as string[],
    fields: [] as string[],
    actions: [] as string[],
    contexts: [] as string[]
  };
  
  // Extract endpoints (paths starting with /v1/)
  const endpointMatches = query.match(/\/v1\/[^\s]+/g);
  if (endpointMatches) {
    terms.endpoints = endpointMatches;
  }
  
  // Extract HTTP methods
  const methodMatches = query.match(/\b(GET|POST|PUT|DELETE)\b/gi);
  if (methodMatches) {
    terms.methods = methodMatches.map(m => m.toUpperCase());
  }
  
  // Extract field names (camelCase or snake_case)
  const fieldMatches = query.match(/\b[a-z]+([A-Z][a-z]*)+|\b[a-z]+(_[a-z]+)+\b/g);
  if (fieldMatches) {
    terms.fields = fieldMatches;
  }
  
  // Extract actions (ALL_CAPS words)
  const actionMatches = query.match(/\b[A-Z_]+[A-Z]\b/g);
  if (actionMatches) {
    terms.actions = actionMatches;
  }
  
  // Extract contexts (specific enum values)
  const contextMatches = query.match(/\b(GLOBAL_ONBOARDING_[A-Z_]+)\b/g);
  if (contextMatches) {
    terms.contexts = contextMatches;
  }
  
  return terms;
}

/**
 * Boost query for exact API matches
 */
export function boostApiQuery(query: string): string {
  const terms = extractApiTerms(query);
  const boostedTerms: string[] = [];
  
  // Add original query
  boostedTerms.push(query);
  
  // Boost endpoints with higher weight
  terms.endpoints.forEach(endpoint => {
    boostedTerms.push(`${endpoint} ${endpoint} ${endpoint}`); // Triple weight
  });
  
  // Boost methods
  terms.methods.forEach(method => {
    boostedTerms.push(`${method} ${method}`); // Double weight
  });
  
  // Boost field names
  terms.fields.forEach(field => {
    boostedTerms.push(`${field} ${field}`); // Double weight
  });
  
  return boostedTerms.join(' ');
}

/**
 * Create query variations for better retrieval
 */
export function createQueryVariations(query: string): string[] {
  const variations: string[] = [];
  
  // Original query
  variations.push(query);
  
  // Expanded with synonyms
  variations.push(expandQueryWithSynonyms(query));
  
  // API-boosted version
  variations.push(boostApiQuery(query));
  
  // Extract and emphasize API terms
  const terms = extractApiTerms(query);
  if (terms.endpoints.length > 0 || terms.methods.length > 0) {
    const apiTerms = [...terms.endpoints, ...terms.methods, ...terms.fields];
    variations.push(apiTerms.join(' '));
  }
  
  // Remove duplicates
  return [...new Set(variations)];
}
