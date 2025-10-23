// lib/chat/intent.ts
// Intent detection for query-specific retrieval and response strategies

export type Intent = 'JSON' | 'TABLE' | 'ENDPOINT' | 'WORKFLOW' | 'CONTACT' | 'IDKEY' | 'ONE_LINE' | 'DEFAULT';

export function detectIntent(q: string): Intent {
  // Ensure q is a string
  if (typeof q !== 'string') {
    console.error('detectIntent received non-string:', typeof q, q);
    return 'DEFAULT';
  }
  
  const s = q.toLowerCase().trim();
  
  // Greeting - simple hi/hello/hey
  if (/^(hi|hello|hey|hola|greetings?)[\s!.?]*$/i.test(q.trim())) {
    return 'DEFAULT'; // Will get handled by programmatic response
  }
  
  // ONE_LINE intent - requests for one-line answers or specific technical details
  if (/\b(one line|in one line|single line|on one line)\b/i.test(q) ||
      /\b(which|what|how many|list)\s+(authentication\s+)?headers?\s+(are\s+)?required/i.test(q) ||
      /\b(what's\s+the\s+)?difference\s+between/i.test(q) ||
      /\b(show\s+me\s+the\s+)?format\s+of/i.test(q) ||
      /\b(what\s+does\s+the\s+)?\w+\s+error\s+mean/i.test(q)) {
    return 'ONE_LINE';
  }
  
  // JSON intent - requests for exact JSON bodies, payloads, request/response samples
  if (/\b(show|give|display|provide)\s+(me\s+)?(the\s+)?.*json\b/i.test(q) ||
      /\b(error|response|request)\s+(format|json|body|example)\b/i.test(q) ||
      /(exact|full|raw)\s+json|^json\b|request body|payload|sample.*request|sample.*response/.test(s)) {
    return 'JSON';
  }
  
  // TABLE intent - markdown table patterns, components table (check before ENDPOINT)
  if (/\b(table|markdown table|components\b.*table)\b/i.test(q) ||
      /\/boarding-case\/components/i.test(q) ||
      /\b(components?\s+(in|of)\s+(the\s+)?(get|post|response|request))\b/i.test(q) ||
      /\b(what\s+are\s+the\s+components?)\b/i.test(q) ||
      /table|columns|as a markdown table|components?\b.*list|list.*components?/.test(s)) {
    return 'TABLE';
  }
  
  // ENDPOINT intent - method + path patterns, endpoint mentions
  if (/\b(endpoint|method\s*\+\s*path|^get\s+\/|^post\s+\/|^put\s+\/|^delete\s+\/|^patch\s+\/)\b/i.test(q) ||
      /\/[a-z0-9][^\s]*/i.test(q) ||
      /endpoint|path|route|method\b.*(list|lists|action reasons)|which endpoint|what endpoint/.test(s)) {
    return 'ENDPOINT';
  }
  
  // WORKFLOW intent - integration steps, setup guides, how-to questions
  if (/\b(how\s+(do\s+i|to)\s+(integrate|set\s*up|implement|configure|install|deploy|onboard|use))\b/i.test(q) ||
      /\b(integration\s+steps|setup\s+guide|implementation\s+guide)\b/i.test(q) ||
      /poll|polling|cadence|timing|asynchronous|async|every\s+\d+(-|\s*)\d*\s*seconds|min|workflow|steps/.test(s)) {
    return 'WORKFLOW';
  }
  
  // CONTACT intent - ONLY for explicit contact/support requests (not general "support" mentions)
  const isAuthQuery = /\b(auth|authentication|token|bearer|header|oauth|api key|jwt|credentials)\b/i.test(q);
  const isExplicitContactRequest = /\b(what\s+is\s+(the\s+)?(contact|email|support)|(how|where)\s+(do\s+i|can\s+i|to)\s+(contact|reach|email)|who\s+(do\s+i|should\s+i|can\s+i)\s+contact|contact\s+(info|information|details|email)|support\s+(email|contact)|clientservices@)\b/i.test(q);
  
  if (!isAuthQuery && isExplicitContactRequest) {
    return 'CONTACT';
  }
  
  // IDKEY intent - requests about specific IDs or keys
  if (/\b(id|id:|reasonid|actionid|destinationmerchantgroupid|caseid|boardingcaseid)\b/.test(s)) {
    return 'IDKEY';
  }
  
  return 'DEFAULT';
}
