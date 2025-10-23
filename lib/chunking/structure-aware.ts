// lib/chunking/structure-aware.ts
// Structure-aware chunking that preserves tables, sections, and context

export interface ChunkWithMetadata {
  id: string;
  content: string;
  chunkIndex: number;
  metadata: {
    section?: string;
    page?: number;
    heading?: string;
    tableContext?: boolean;
    endpointInfo?: {
      method?: string;
      path?: string;
      params?: string[];
    };
  };
}

export interface ChunkingOptions {
  maxTokens?: number;
  overlapTokens?: number;
  preserveTables?: boolean;
  preserveSections?: boolean;
  extractEndpoints?: boolean;
}

const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  maxTokens: 1000,
  overlapTokens: 150,  // 150-token overlap for better context continuity
  preserveTables: true,
  preserveSections: true,
  extractEndpoints: true,
};

/**
 * Structure-aware chunking that:
 * 1. Preserves table + caption + lead paragraph together
 * 2. Keeps section headers with their content
 * 3. Extracts endpoint information for better retrieval
 * 4. Maintains context boundaries at logical breaks
 */
export function chunkWithStructureAwareness(
  content: string,
  options: ChunkingOptions = {}
): ChunkWithMetadata[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Split by major sections first
  const sections = splitIntoSections(content);
  const chunks: ChunkWithMetadata[] = [];
  
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    
    // Extract metadata for this section
    const metadata = extractSectionMetadata(section);
    
    // Check if this is a table-heavy section
    if (opts.preserveTables && isTableSection(section.content)) {
      // Attach surrounding paragraphs to table for context
      const enrichedContent = attachTableContext(section.content, sections, sectionIndex);
      
      // Keep table sections intact if they fit in token limit
      if (estimateTokens(enrichedContent) <= opts.maxTokens * 1.2) { // Allow 20% more for tables
        chunks.push({
          id: `section_${sectionIndex}`,
          content: enrichedContent,
          chunkIndex: chunks.length,
          metadata: {
            ...metadata,
            tableContext: true,
            endpointInfo: opts.extractEndpoints ? extractEndpointInfo(enrichedContent) : undefined,
          },
        });
        continue;
      }
    }
    
    // For regular sections, chunk with overlap while preserving context
    const sectionChunks = chunkSectionWithOverlap(section.content, opts, sectionIndex);
    
    sectionChunks.forEach((chunk, chunkIndex) => {
      chunks.push({
        id: `section_${sectionIndex}_chunk_${chunkIndex}`,
        content: chunk,
        chunkIndex: chunks.length,
        metadata: {
          ...metadata,
          endpointInfo: opts.extractEndpoints ? extractEndpointInfo(chunk) : undefined,
        },
      });
    });
  }
  
  return chunks;
}

function splitIntoSections(content: string): Array<{ title?: string; content: string }> {
  const sections: Array<{ title?: string; content: string }> = [];
  
  // Split by major headings (H1, H2, or strong section markers)
  const headingPattern = /^(#{1,2}\s+.*|^[A-Z][A-Z\s]+:?\s*$|^Request types summary|^Common workflows|^Action-reasons|^Action-cases)/m;
  const parts = content.split(headingPattern);
  
  for (let i = 0; i < parts.length; i += 2) {
    const title = parts[i]?.trim();
    const content = parts[i + 1]?.trim();
    
    if (content) {
      sections.push({
        title: title || undefined,
        content: title ? `${title}\n\n${content}` : content,
      });
    }
  }
  
  // If no sections found, treat as single section
  if (sections.length === 0) {
    sections.push({ content });
  }
  
  return sections;
}

function extractSectionMetadata(section: { title?: string; content: string }) {
  const metadata: ChunkWithMetadata['metadata'] = {};
  
  // Extract page numbers
  const pageMatch = section.content.match(/page\s+(\d+)|p\.\s*(\d+)/i);
  if (pageMatch) {
    metadata.page = parseInt(pageMatch[1] || pageMatch[2]);
  }
  
  // Extract section/heading
  if (section.title) {
    metadata.section = section.title;
    metadata.heading = section.title;
  }
  
  return metadata;
}

function isTableSection(content: string): boolean {
  // Check for table indicators
  const tableIndicators = [
    /Request types summary/i,
    /endpoint.*method.*path/i,
    /GET.*POST.*PUT.*DELETE/i,
    /\|.*\|.*\|/,  // Markdown table
    /^\s*\w+\s+\w+\s+\w+.*$/m,  // Space-separated columns
  ];
  
  return tableIndicators.some(pattern => pattern.test(content));
}

/**
 * Attach surrounding paragraphs to table for better context
 * Includes the paragraph before and after the table
 */
function attachTableContext(
  tableContent: string,
  allSections: Array<{ title?: string; content: string }>,
  currentIndex: number
): string {
  let enrichedContent = tableContent;
  
  // Get previous section's last paragraph
  if (currentIndex > 0) {
    const prevSection = allSections[currentIndex - 1];
    const prevParagraphs = prevSection.content.split(/\n\n+/);
    const lastParagraph = prevParagraphs[prevParagraphs.length - 1]?.trim();
    
    if (lastParagraph && lastParagraph.length > 20 && lastParagraph.length < 500) {
      enrichedContent = `${lastParagraph}\n\n${enrichedContent}`;
    }
  }
  
  // Get next section's first paragraph
  if (currentIndex < allSections.length - 1) {
    const nextSection = allSections[currentIndex + 1];
    const nextParagraphs = nextSection.content.split(/\n\n+/);
    const firstParagraph = nextParagraphs[0]?.trim();
    
    if (firstParagraph && firstParagraph.length > 20 && firstParagraph.length < 500) {
      enrichedContent = `${enrichedContent}\n\n${firstParagraph}`;
    }
  }
  
  return enrichedContent;
}

function chunkSectionWithOverlap(
  content: string,
  options: Required<ChunkingOptions>,
  sectionIndex: number
): string[] {
  const chunks: string[] = [];
  const sentences = content.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    // If adding this sentence would exceed limit, save current chunk
    if (currentTokens + sentenceTokens > options.maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, options.overlapTokens);
      currentChunk = overlapText + ' ' + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(/\s+/);
  const overlapWords = Math.floor(overlapTokens * 1.3); // Rough word-to-token ratio
  return words.slice(-overlapWords).join(' ');
}

function extractEndpointInfo(content: string): ChunkWithMetadata['metadata']['endpointInfo'] {
  // Extract API endpoint information
  const endpointPatterns = [
    /(GET|POST|PUT|DELETE)\s+(\/v1\/[^\s]+)/g,
    /(\/v1\/[^\w\s]+)/g,
  ];
  
  const endpoints: Array<{ method?: string; path?: string }> = [];
  
  for (const pattern of endpointPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1] || undefined,
        path: match[2] || match[1],
      });
    }
  }
  
  if (endpoints.length > 0) {
    return {
      method: endpoints[0].method,
      path: endpoints[0].path,
      params: endpoints.map(e => e.path).filter(Boolean),
    };
  }
  
  return undefined;
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Enhanced chunking for API documentation that preserves:
 * - Endpoint tables with their descriptions
 * - Parameter lists with their types
 * - Example responses with their context
 */
export function chunkApiDocumentation(
  content: string,
  options: ChunkingOptions = {}
): ChunkWithMetadata[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // First, identify and preserve complete endpoint sections
  const endpointSections = extractEndpointSections(content);
  const chunks: ChunkWithMetadata[] = [];
  
  for (let i = 0; i < endpointSections.length; i++) {
    const section = endpointSections[i];
    const metadata = extractApiMetadata(section);
    
    // If section is small enough, keep it intact
    if (estimateTokens(section.content) <= opts.maxTokens) {
      chunks.push({
        id: `endpoint_${i}`,
        content: section.content,
        chunkIndex: chunks.length,
        metadata: {
          ...metadata,
          endpointInfo: extractEndpointInfo(section.content),
        },
      });
    } else {
      // Split large sections while preserving endpoint context
      const sectionChunks = chunkSectionWithOverlap(section.content, opts, i);
      sectionChunks.forEach((chunk, chunkIndex) => {
        chunks.push({
          id: `endpoint_${i}_chunk_${chunkIndex}`,
          content: chunk,
          chunkIndex: chunks.length,
          metadata: {
            ...metadata,
            endpointInfo: extractEndpointInfo(chunk),
          },
        });
      });
    }
  }
  
  return chunks;
}

function extractEndpointSections(content: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  
  // Split by endpoint patterns
  const endpointPattern = /(GET|POST|PUT|DELETE)\s+\/v1\/[^\s]+.*?(?=(?:GET|POST|PUT|DELETE)\s+\/v1\/[^\s]+|$)/gs;
  const matches = content.match(endpointPattern);
  
  if (matches) {
    matches.forEach((match, index) => {
      const lines = match.trim().split('\n');
      const title = lines[0]?.trim() || `Endpoint ${index + 1}`;
      sections.push({
        title,
        content: match.trim(),
      });
    });
  }
  
  // If no endpoints found, treat as single section
  if (sections.length === 0) {
    sections.push({ title: 'Documentation', content });
  }
  
  return sections;
}

function extractApiMetadata(section: { title: string; content: string }) {
  const metadata: ChunkWithMetadata['metadata'] = {};
  
  // Extract page numbers
  const pageMatch = section.content.match(/page\s+(\d+)|p\.\s*(\d+)/i);
  if (pageMatch) {
    metadata.page = parseInt(pageMatch[1] || pageMatch[2]);
  }
  
  metadata.section = section.title;
  metadata.heading = section.title;
  
  return metadata;
}
