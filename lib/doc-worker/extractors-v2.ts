/**
 * Doc-Worker V2.1 - Enhanced Extractors
 * Extracts footers, emails, JSON, code blocks, endpoints, tables with precision
 */

export interface VerbatimBlock {
  type: 'json' | 'code' | 'table';
  content: string;
  language?: string; // For code blocks
  startLine?: number;
  endLine?: number;
}

export interface EndpointMatch {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  fullMatch: string;
  lineNumber?: number;
}

export interface EnhancedMetadata {
  // Verbatim content
  has_verbatim?: boolean;
  verbatim_blocks?: VerbatimBlock[];
  
  // Endpoints
  endpoints?: EndpointMatch[];
  
  // Tables
  table_md?: string;
  
  // Contact info
  emails?: string[];
  element_type?: 'header' | 'footer' | 'content' | 'table' | 'code';
  
  // Structure
  section_path?: string;
  is_footer?: boolean;
  is_header?: boolean;
}

/**
 * Extract email addresses from text
 * Targets: Contact, Support, footer sections
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  
  // Deduplicate
  return Array.from(new Set(matches));
}

/**
 * Detect if text is a footer section
 * Indicators: page numbers, copyright, contact info, legal text
 */
export function isFooterSection(text: string): boolean {
  const footerIndicators = [
    /\bcopyright\b/i,
    /©\s*\d{4}/,
    /\ball rights reserved\b/i,
    /\bconfidential\b/i,
    /\bproprietary\b/i,
    /\bcontact\s+(us|support|info)\b/i,
    /\bsupport@/i,
    /\binfo@/i,
    /\bhelp@/i,
    /\bpage\s+\d+\s+of\s+\d+/i,
    /^\d+\s*$/m, // Just a page number
  ];
  
  let score = 0;
  for (const pattern of footerIndicators) {
    if (pattern.test(text)) score++;
  }
  
  // Footer if 2+ indicators or very short with email
  return score >= 2 || (text.length < 200 && extractEmails(text).length > 0);
}

/**
 * Detect if text is a header section
 * Indicators: title case, short, ALL CAPS, numbered sections
 */
export function isHeaderSection(text: string): boolean {
  const lines = text.trim().split('\n');
  if (lines.length > 5) return false; // Headers are usually short
  
  const firstLine = lines[0].trim();
  
  const headerPatterns = [
    /^[A-Z\s]+$/, // ALL CAPS
    /^\d+(\.\d+)*\s+[A-Z]/, // Numbered section (1.2.3 Title)
    /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*:$/, // Title Case:
    /^#+\s+/, // Markdown headers
  ];
  
  return headerPatterns.some(p => p.test(firstLine));
}

/**
 * Extract JSON blocks with high precision
 * Uses brace/colon ratio + structure validation
 */
export function extractJSONBlocks(text: string): VerbatimBlock[] {
  const blocks: VerbatimBlock[] = [];
  
  // Pattern 1: Fenced code blocks with json/javascript
  const fencedRegex = /```(?:json|javascript|js)?\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = fencedRegex.exec(text)) !== null) {
    const content = match[1].trim();
    if (isValidJSON(content)) {
      blocks.push({
        type: 'json',
        content,
        language: 'json'
      });
    }
  }
  
  // Pattern 2: Bare JSON objects (not in fences)
  // Look for balanced braces with reasonable structure
  const jsonRegex = /\{[\s\S]*?\}/g;
  const matches = text.match(jsonRegex) || [];
  
  for (const candidate of matches) {
    // Skip if already captured in fenced block
    if (blocks.some(b => b.content.includes(candidate))) continue;
    
    // Validate structure
    if (isLikelyJSON(candidate) && candidate.length >= 20) {
      blocks.push({
        type: 'json',
        content: candidate.trim(),
        language: 'json'
      });
    }
  }
  
  return blocks;
}

/**
 * Validate if string is actual JSON
 */
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Heuristic: does this look like JSON?
 * Checks brace/colon ratio, quotes, structure
 */
function isLikelyJSON(str: string): boolean {
  if (str.length < 10) return false;
  
  const braceCount = (str.match(/[{}]/g) || []).length;
  const colonCount = (str.match(/:/g) || []).length;
  const quoteCount = (str.match(/"/g) || []).length;
  
  // JSON has lots of colons, quotes, and balanced braces
  if (colonCount < 1 || quoteCount < 2) return false;
  if (braceCount % 2 !== 0) return false; // Unbalanced
  
  // Ratio check: colon/brace should be reasonable
  const ratio = colonCount / (braceCount || 1);
  if (ratio < 0.3) return false; // Too few colons
  
  return true;
}

/**
 * Extract code blocks (non-JSON)
 */
export function extractCodeBlocks(text: string): VerbatimBlock[] {
  const blocks: VerbatimBlock[] = [];
  
  // Fenced code blocks
  const fencedRegex = /```([a-z]*)\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = fencedRegex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const content = match[2].trim();
    
    // Skip if it's JSON (handled separately)
    if (language === 'json' || language === 'javascript') continue;
    
    blocks.push({
      type: 'code',
      content,
      language
    });
  }
  
  // Indented code blocks (4+ spaces)
  const lines = text.split('\n');
  let codeBuffer: string[] = [];
  
  for (const line of lines) {
    if (line.match(/^    /) || line.match(/^\t/)) {
      codeBuffer.push(line.replace(/^    |^\t/, ''));
    } else if (codeBuffer.length > 0) {
      // End of code block
      if (codeBuffer.length >= 3) { // Minimum 3 lines
        blocks.push({
          type: 'code',
          content: codeBuffer.join('\n').trim()
        });
      }
      codeBuffer = [];
    }
  }
  
  return blocks;
}

/**
 * Extract HTTP endpoints with METHOD + path
 * Targets: GET /path, POST /path, etc.
 */
export function extractEndpoints(text: string): EndpointMatch[] {
  const endpoints: EndpointMatch[] = [];
  
  // Pattern: METHOD /path
  const endpointRegex = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z0-9._\-/{}:]*)/g;
  let match;
  
  while ((match = endpointRegex.exec(text)) !== null) {
    endpoints.push({
      method: match[1] as any,
      path: match[2],
      fullMatch: match[0]
    });
  }
  
  // Pattern: Full URLs with method
  const urlRegex = /(GET|POST|PUT|PATCH|DELETE)\s+https?:\/\/[^\s]+/g;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0].split(/\s+/)[1];
    const path = url.replace(/https?:\/\/[^\/]+/, '');
    
    endpoints.push({
      method: match[1] as any,
      path: path || '/',
      fullMatch: match[0]
    });
  }
  
  // Deduplicate by path
  const seen = new Set<string>();
  return endpoints.filter(ep => {
    const key = `${ep.method} ${ep.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract markdown tables
 */
export function extractTables(text: string): VerbatimBlock[] {
  const blocks: VerbatimBlock[] = [];
  
  // Markdown table pattern: | col1 | col2 |
  const lines = text.split('\n');
  let tableBuffer: string[] = [];
  
  for (const line of lines) {
    if (line.trim().match(/^\|.*\|$/)) {
      tableBuffer.push(line);
    } else if (tableBuffer.length > 0) {
      // End of table
      if (tableBuffer.length >= 3) { // Header + separator + at least 1 row
        blocks.push({
          type: 'table',
          content: tableBuffer.join('\n').trim()
        });
      }
      tableBuffer = [];
    }
  }
  
  // Catch table at end of text
  if (tableBuffer.length >= 3) {
    blocks.push({
      type: 'table',
      content: tableBuffer.join('\n').trim()
    });
  }
  
  return blocks;
}

/**
 * Extract enhanced section path
 * Improves detection of:
 * - ALL CAPS headers
 * - Numbered sections (1.2.3)
 * - Headers with colons
 */
export function extractSectionPath(text: string, previousPath?: string): string | null {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return previousPath || null;
  
  const firstLine = lines[0].trim();
  
  // Pattern 1: Numbered section (1.2.3 Title)
  const numberedMatch = firstLine.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  if (numberedMatch) {
    return `${numberedMatch[1]} ${numberedMatch[2]}`;
  }
  
  // Pattern 2: ALL CAPS (minimum 3 words)
  if (firstLine.match(/^[A-Z\s]{10,}$/)) {
    return firstLine;
  }
  
  // Pattern 3: Title with colon
  const colonMatch = firstLine.match(/^([A-Z][^:]+):$/);
  if (colonMatch) {
    return colonMatch[1];
  }
  
  // Pattern 4: Markdown header
  const mdMatch = firstLine.match(/^(#+)\s+(.+)$/);
  if (mdMatch) {
    return mdMatch[2];
  }
  
  return previousPath || null;
}

/**
 * Combine all extractors into enhanced metadata
 */
export function extractEnhancedMetadata(text: string, page?: number): EnhancedMetadata {
  const metadata: EnhancedMetadata = {};
  
  // Element type
  if (isFooterSection(text)) {
    metadata.element_type = 'footer';
    metadata.is_footer = true;
  } else if (isHeaderSection(text)) {
    metadata.element_type = 'header';
    metadata.is_header = true;
  } else {
    metadata.element_type = 'content';
  }
  
  // Emails
  const emails = extractEmails(text);
  if (emails.length > 0) {
    metadata.emails = emails;
  }
  
  // Verbatim blocks
  const jsonBlocks = extractJSONBlocks(text);
  const codeBlocks = extractCodeBlocks(text);
  const tableBlocks = extractTables(text);
  
  const allVerbatim = [...jsonBlocks, ...codeBlocks, ...tableBlocks];
  if (allVerbatim.length > 0) {
    metadata.has_verbatim = true;
    metadata.verbatim_blocks = allVerbatim;
    
    // Set element type if predominantly code/table
    if (tableBlocks.length > 0) {
      metadata.element_type = 'table';
      metadata.table_md = tableBlocks[0].content;
    } else if (jsonBlocks.length + codeBlocks.length > 0) {
      metadata.element_type = 'code';
    }
  }
  
  // Endpoints
  const endpoints = extractEndpoints(text);
  if (endpoints.length > 0) {
    metadata.endpoints = endpoints;
  }
  
  // Section path
  const sectionPath = extractSectionPath(text);
  if (sectionPath) {
    metadata.section_path = sectionPath;
  }
  
  return metadata;
}

/**
 * Smart chunking: never split inside JSON/code/table blocks
 */
export function smartChunk(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  
  // Extract all verbatim blocks with positions
  const jsonBlocks = extractJSONBlocks(text);
  const codeBlocks = extractCodeBlocks(text);
  const tableBlocks = extractTables(text);
  
  const allBlocks = [...jsonBlocks, ...codeBlocks, ...tableBlocks];
  
  // Find positions of all blocks
  const blockPositions: Array<{ start: number; end: number; content: string }> = [];
  for (const block of allBlocks) {
    const start = text.indexOf(block.content);
    if (start >= 0) {
      blockPositions.push({
        start,
        end: start + block.content.length,
        content: block.content
      });
    }
  }
  
  // Sort by start position
  blockPositions.sort((a, b) => a.start - b.start);
  
  // Chunk text, avoiding splits inside blocks
  let pos = 0;
  let currentChunk = '';
  
  while (pos < text.length) {
    // Check if we're at the start of a block
    const blockAtPos = blockPositions.find(b => b.start === pos);
    
    if (blockAtPos) {
      // Entire block goes into one chunk
      if (currentChunk.length > 0 && currentChunk.length + blockAtPos.content.length > maxChunkSize) {
        // Flush current chunk
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      currentChunk += blockAtPos.content;
      pos = blockAtPos.end;
    } else {
      // Normal text
      const nextBlockStart = blockPositions.find(b => b.start > pos)?.start || text.length;
      const segment = text.slice(pos, Math.min(pos + maxChunkSize, nextBlockStart));
      
      if (currentChunk.length + segment.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = segment;
      } else {
        currentChunk += segment;
      }
      
      pos += segment.length;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

