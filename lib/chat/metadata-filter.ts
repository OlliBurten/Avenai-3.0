// lib/chat/metadata-filter.ts
// Safe metadata filter builder for SQL WHERE clauses

/**
 * Build safe SQL WHERE clause for metadata filters
 * Prevents SQL injection by using parameterized queries
 */
export function buildMetadataWhere(filter: Record<string, string>): {
  sql: string;
  params: any[];
} {
  const clauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(filter)) {
    // Validate key format (prevent injection)
    if (!isValidMetadataKey(key)) {
      console.warn(`Invalid metadata key: ${key}`);
      continue;
    }
    
    clauses.push(`${key} = $${paramIndex++}`);
    params.push(value);
  }
  
  return {
    sql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
    params
  };
}

/**
 * Validate metadata key format
 */
function isValidMetadataKey(key: string): boolean {
  // Allow only safe metadata accessor patterns
  const validPatterns = [
    /^metadata->>'[a-z_]+'$/,                    // metadata->>'element_type'
    /^\(metadata->>'[a-z_]+'\)::int$/,          // (metadata->>'page')::int
    /^\(metadata->>'[a-z_]+'\)::boolean$/,      // (metadata->>'hasJson')::boolean
  ];
  
  return validPatterns.some(pattern => pattern.test(key));
}

/**
 * Build Prisma-compatible metadata filter
 * For use with Prisma's where clause
 */
export function buildPrismaMetadataFilter(filter: Record<string, string>): any {
  const prismaFilter: any = {};
  
  for (const [key, value] of Object.entries(filter)) {
    // Extract the field name from metadata accessor
    const fieldMatch = key.match(/metadata->>'([a-z_]+)'/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      
      // Handle different value types
      if (value === 'true' || value === 'false') {
        prismaFilter[`metadata.${field}`] = value === 'true';
      } else if (!isNaN(Number(value))) {
        prismaFilter[`metadata.${field}`] = Number(value);
      } else {
        prismaFilter[`metadata.${field}`] = value;
      }
    }
  }
  
  return prismaFilter;
}

/**
 * Common metadata filters for different intents
 */
export const METADATA_FILTERS = {
  TABLE: { "metadata->>'element_type'": "table" },
  JSON: { "metadata->>'hasJson'": "true" },
  FOOTER: { "metadata->>'element_type'": "footer" },
  CODE: { "metadata->>'element_type'": "code" },
  HEADING: { "metadata->>'element_type'": "heading" },
} as const;

