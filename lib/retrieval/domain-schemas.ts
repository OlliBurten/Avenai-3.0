/**
 * Domain Schema Awareness
 * ChatGPT-style structured knowledge about API patterns, headers, endpoints, errors
 */

export interface DomainPattern {
  type: 'header' | 'endpoint' | 'error' | 'parameter' | 'response';
  pattern: RegExp;
  extract: (match: RegExpMatchArray, context: string) => any;
  score: number; // Base relevance score
}

/**
 * API Header Patterns
 * Recognizes authentication headers, API keys, etc.
 */
export const HEADER_PATTERNS: DomainPattern[] = [
  {
    type: 'header',
    pattern: /Authorization:\s*Bearer\s+<[^>]+>/gi,
    extract: (match, context) => ({
      name: 'Authorization',
      format: match[0],
      description: 'JWT Bearer token for authentication'
    }),
    score: 1.0
  },
  {
    type: 'header',
    pattern: /Zs-Product-Key:\s*<[^>]+>/gi,
    extract: (match, context) => ({
      name: 'Zs-Product-Key',
      format: match[0],
      description: 'ZignSec product subscription key'
    }),
    score: 1.0
  },
  {
    type: 'header',
    pattern: /(Authorization|Content-Type|Accept|X-[A-Z][a-zA-Z-]*|Api-Key|API-Key):\s*([^\r\n]+)/gi,
    extract: (match, context) => ({
      name: match[1],
      value: match[2].trim(),
      description: `HTTP header: ${match[1]}`
    }),
    score: 0.8
  }
];

/**
 * API Endpoint Patterns
 * Recognizes REST endpoints, HTTP methods, etc.
 */
export const ENDPOINT_PATTERNS: DomainPattern[] = [
  {
    type: 'endpoint',
    pattern: /(GET|POST|PUT|DELETE|PATCH)\s+(\/[a-zA-Z0-9\/_\-{}:]+)/gi,
    extract: (match, context) => ({
      method: match[1],
      path: match[2],
      full: `${match[1]} ${match[2]}`,
      description: extractEndpointDescription(match[2], context)
    }),
    score: 1.0
  },
  {
    type: 'endpoint',
    pattern: /https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/[a-zA-Z0-9\/_\-{}]*/gi,
    extract: (match, context) => ({
      url: match[0],
      baseUrl: match[0].match(/https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/)?.[0],
      path: match[0].replace(/https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/, ''),
      description: extractEndpointDescription(match[0], context)
    }),
    score: 0.9
  }
];

/**
 * Error Code Patterns
 */
export const ERROR_PATTERNS: DomainPattern[] = [
  {
    type: 'error',
    pattern: /\b([A-Z_]{3,})\b(?:\s*-\s*|\s*:\s*|\s+)([^.\n]+)/g,
    extract: (match, context) => ({
      code: match[1],
      message: match[2].trim(),
      description: match[2].trim()
    }),
    score: 0.9
  },
  {
    type: 'error',
    pattern: /HTTP\s+(\d{3})\s+([A-Z][a-zA-Z\s]+)/gi,
    extract: (match, context) => ({
      code: match[1],
      message: match[2].trim(),
      description: `HTTP ${match[1]}: ${match[2].trim()}`
    }),
    score: 0.8
  }
];

/**
 * JSON Parameter Patterns
 */
export const PARAMETER_PATTERNS: DomainPattern[] = [
  {
    type: 'parameter',
    pattern: /"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:\s*"([^"]+)"/g,
    extract: (match, context) => ({
      name: match[1],
      example: match[2],
      type: inferType(match[2])
    }),
    score: 0.7
  },
  {
    type: 'parameter',
    pattern: /"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:\s*(\d+|true|false|null)/g,
    extract: (match, context) => ({
      name: match[1],
      example: match[2],
      type: inferType(match[2])
    }),
    score: 0.7
  }
];

/**
 * Extract structured knowledge from chunks
 * This is what ChatGPT does internally - it builds a schema of the domain
 */
export function extractDomainKnowledge(chunks: Array<{ content: string; id: string }>) {
  const knowledge = {
    headers: new Map<string, any>(),
    endpoints: new Map<string, any>(),
    errors: new Map<string, any>(),
    parameters: new Map<string, any>()
  };

  for (const chunk of chunks) {
    const content = chunk.content;

    // Extract headers
    for (const pattern of HEADER_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern.pattern));
      for (const match of matches) {
        const extracted = pattern.extract(match, content);
        const key = extracted.name || match[0];
        
        if (!knowledge.headers.has(key)) {
          knowledge.headers.set(key, {
            ...extracted,
            sources: [chunk.id],
            score: pattern.score
          });
        } else {
          knowledge.headers.get(key).sources.push(chunk.id);
        }
      }
    }

    // Extract endpoints
    for (const pattern of ENDPOINT_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern.pattern));
      for (const match of matches) {
        const extracted = pattern.extract(match, content);
        const key = extracted.path || extracted.url || match[0];
        
        if (!knowledge.endpoints.has(key)) {
          knowledge.endpoints.set(key, {
            ...extracted,
            sources: [chunk.id],
            score: pattern.score
          });
        } else {
          knowledge.endpoints.get(key).sources.push(chunk.id);
        }
      }
    }

    // Extract errors
    for (const pattern of ERROR_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern.pattern));
      for (const match of matches) {
        const extracted = pattern.extract(match, content);
        const key = extracted.code || match[0];
        
        if (!knowledge.errors.has(key)) {
          knowledge.errors.set(key, {
            ...extracted,
            sources: [chunk.id],
            score: pattern.score
          });
        } else {
          knowledge.errors.get(key).sources.push(chunk.id);
        }
      }
    }

    // Extract parameters
    for (const pattern of PARAMETER_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern.pattern));
      for (const match of matches) {
        const extracted = pattern.extract(match, content);
        const key = extracted.name || match[0];
        
        if (!knowledge.parameters.has(key)) {
          knowledge.parameters.set(key, {
            ...extracted,
            sources: [chunk.id],
            score: pattern.score
          });
        } else {
          knowledge.parameters.get(key).sources.push(chunk.id);
        }
      }
    }
  }

  return {
    headers: Array.from(knowledge.headers.values()),
    endpoints: Array.from(knowledge.endpoints.values()),
    errors: Array.from(knowledge.errors.values()),
    parameters: Array.from(knowledge.parameters.values())
  };
}

/**
 * Boost chunks that contain domain-specific patterns
 * ChatGPT does this internally - it recognizes structured data and prioritizes it
 */
export function boostDomainRelevance<T extends { content: string; fusedScore: number }>(
  results: T[],
  query: string
): T[] {
  const queryLower = query.toLowerCase();
  
  // Determine query intent
  const isHeaderQuery = /\b(header|auth|token|key|credential)\b/i.test(query);
  const isEndpointQuery = /\b(endpoint|api|url|route|path)\b/i.test(query);
  const isErrorQuery = /\b(error|exception|fail|code)\b/i.test(query);
  
  return results.map(result => {
    let boost = 1.0;
    
    if (isHeaderQuery) {
      // Check if this chunk contains header patterns
      for (const pattern of HEADER_PATTERNS) {
        if (pattern.pattern.test(result.content)) {
          boost *= 1.3; // 30% boost
          break;
        }
      }
    }
    
    if (isEndpointQuery) {
      // Check if this chunk contains endpoint patterns
      for (const pattern of ENDPOINT_PATTERNS) {
        if (pattern.pattern.test(result.content)) {
          boost *= 1.3;
          break;
        }
      }
    }
    
    if (isErrorQuery) {
      // Check if this chunk contains error patterns
      for (const pattern of ERROR_PATTERNS) {
        if (pattern.pattern.test(result.content)) {
          boost *= 1.2;
          break;
        }
      }
    }
    
    return {
      ...result,
      fusedScore: result.fusedScore * boost
    };
  }).sort((a, b) => b.fusedScore - a.fusedScore);
}

/**
 * Helper: Extract endpoint description from context
 */
function extractEndpointDescription(path: string, context: string): string {
  // Look for common description patterns near the endpoint
  const lines = context.split('\n');
  const endpointLineIdx = lines.findIndex(line => line.includes(path));
  
  if (endpointLineIdx >= 0) {
    // Check previous line for description
    if (endpointLineIdx > 0) {
      const prevLine = lines[endpointLineIdx - 1].trim();
      if (prevLine && !prevLine.match(/^(GET|POST|PUT|DELETE|PATCH)/)) {
        return prevLine;
      }
    }
    
    // Check next line for description
    if (endpointLineIdx < lines.length - 1) {
      const nextLine = lines[endpointLineIdx + 1].trim();
      if (nextLine && !nextLine.match(/^(GET|POST|PUT|DELETE|PATCH)/)) {
        return nextLine;
      }
    }
  }
  
  return '';
}

/**
 * Helper: Infer type from JSON value
 */
function inferType(value: string): string {
  if (value === 'true' || value === 'false') return 'boolean';
  if (value === 'null') return 'null';
  if (/^\d+$/.test(value)) return 'integer';
  if (/^\d+\.\d+$/.test(value)) return 'number';
  return 'string';
}

